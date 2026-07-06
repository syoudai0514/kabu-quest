/**
 * 市場データ変換スクリプト
 *
 * scripts/raw/ の生CSVから、ゲーム同梱用の月次データJSONを生成する。
 *   node scripts/build-market-data.mjs
 * 出力: src/data/generated/sp500.json, nikkei225.json
 *
 * データソース（詳細は docs/HANDOFF.md §データ更新手順）:
 * - sp500.csv        : datasets/s-and-p-500 (GitHub) = Robert Shiller "Irrational
 *                      Exuberance" 公開データ由来。値は各月の「日次終値の月中平均」
 *                      （月末終値ではない点に注意。docs/GDD.md §12 参照）
 * - nikkei_macro.csv : macrotrends.net "Nikkei 225 Index - 67 Year Historical Chart"
 *                      日次終値 1949-05〜2020-04。attribution: www.macrotrends.net
 * - nikkei_recent.csv: investing.com 由来の日次データ 2011-01〜2024-10
 *                      (github.com/nikhilchandra-stats/asset_data)
 *
 * 日経は日次→「月末終値」に変換して2系列を接合する（2011-01以降はrecent優先）。
 * S&P500が月中平均・日経が月末終値という方法論の不一致は意図的な妥協であり、
 * 将来 Stooq 等から両方の月末終値を取り直す手順を docs/HANDOFF.md に記載済み。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'scripts', 'raw');
const OUT = join(ROOT, 'src', 'data', 'generated');

/** ゲームで使う期間。両指数が揃う範囲に後で切り詰める */
const GAME_START = '1985-01';

// ---------- S&P500 (Shiller, 月中平均) ----------
function buildSp500() {
  const lines = readFileSync(join(RAW, 'sp500.csv'), 'utf8').trim().split('\n');
  const header = lines[0].split(',');
  const iDate = header.indexOf('Date');
  const iPrice = header.indexOf('SP500');
  /** @type {Map<string, number>} */
  const byMonth = new Map();
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const month = cols[iDate].slice(0, 7); // YYYY-MM
    const price = Number(cols[iPrice]);
    if (Number.isFinite(price) && price > 0) byMonth.set(month, price);
  }
  return byMonth;
}

// ---------- 日経225 (日次→月末終値) ----------
function lastTradingDayCloses(dailyRows) {
  // dailyRows: [{ date: 'YYYY-MM-DD', close: number }] 昇順である必要はない
  const sorted = [...dailyRows].sort((a, b) => a.date.localeCompare(b.date));
  /** @type {Map<string, number>} */
  const byMonth = new Map();
  for (const { date, close } of sorted) {
    byMonth.set(date.slice(0, 7), close); // 昇順なので最後に来た日が月内最終営業日
  }
  return byMonth;
}

function buildNikkei() {
  // macrotrends: プリアンブル行のあと "date, value"
  const macroLines = readFileSync(join(RAW, 'nikkei_macro.csv'), 'utf8').split('\n');
  const macroRows = [];
  let inData = false;
  for (const line of macroLines) {
    if (!inData) {
      if (line.trim().replace(/\s/g, '') === 'date,value') inData = true;
      continue;
    }
    const m = line.match(/^(\d{4}-\d{2}-\d{2}),\s*([\d.]+)/);
    if (m) macroRows.push({ date: m[1], close: Number(m[2]) });
  }

  // investing.com形式: "MM/DD/YYYY","39,180.30",...（降順・桁区切りカンマ入り）
  const recentLines = readFileSync(join(RAW, 'nikkei_recent.csv'), 'utf8').split('\n');
  const recentRows = [];
  for (const line of recentLines.slice(1)) {
    const cells = [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    if (cells.length < 2) continue;
    const [mm, dd, yyyy] = cells[0].split('/');
    if (!yyyy) continue;
    const close = Number(cells[1].replace(/,/g, ''));
    if (Number.isFinite(close)) {
      recentRows.push({ date: `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`, close });
    }
  }

  const macroMonthly = lastTradingDayCloses(macroRows);
  const recentMonthly = lastTradingDayCloses(recentRows);

  // 接合: 2011-01以降はrecent（真の月末終値・期間も新しい）を優先。
  // recent最終月は月途中で切れている可能性があるため、月末まで揃った月のみ採用する
  // （最終行の月は捨てる）。
  const recentMonths = [...recentMonthly.keys()].sort();
  recentMonths.pop(); // 末尾の不完全な月を除外
  const merged = new Map();
  for (const [month, close] of macroMonthly) {
    if (month < '2011-01') merged.set(month, close);
  }
  for (const month of recentMonths) {
    merged.set(month, recentMonthly.get(month));
  }
  return merged;
}

// ---------- 共通: 連続月チェック＆JSON出力 ----------
function toSeries(byMonth, startMonth) {
  const months = [...byMonth.keys()].sort().filter((m) => m >= startMonth);
  // 月の欠落があればそこで打ち切る（欠落データでリターン計算を歪めないため）
  const prices = [];
  let cur = months[0];
  for (const m of months) {
    if (m !== cur) break;
    prices.push(byMonth.get(m));
    const [y, mo] = cur.split('-').map(Number);
    cur = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
  }
  return { startMonth: months[0], prices };
}

function writeJson(name, obj) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), JSON.stringify(obj), 'utf8');
  const end = endMonth(obj.startMonth, obj.prices.length);
  console.log(`${name}: ${obj.startMonth} .. ${end} (${obj.prices.length} months)`);
}

function endMonth(start, count) {
  let [y, m] = start.split('-').map(Number);
  m += count - 1;
  y += Math.floor((m - 1) / 12);
  m = ((m - 1) % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

const sp500 = toSeries(buildSp500(), GAME_START);
const nikkei = toSeries(buildNikkei(), GAME_START);

writeJson('sp500.json', {
  id: 'sp500',
  currency: 'USD(1pt=1円換算)',
  methodology: 'monthly-average-of-daily-closes',
  source: {
    name: 'Robert Shiller / datasets/s-and-p-500 (GitHub)',
    url: 'https://github.com/datasets/s-and-p-500',
    license: 'ODC-PDDL (dataset packaging) / Shiller data publicly available',
    retrievedAt: '2026-07-06',
    note: '配当・為替は含まない価格指数。値は月中平均（docs/GDD.md §12）',
  },
  ...sp500,
});

writeJson('nikkei225.json', {
  id: 'nikkei225',
  currency: 'JPY(1pt=1円換算)',
  methodology: 'month-end-close',
  source: {
    name: 'macrotrends.net (1985-2010) + investing.com via nikhilchandra-stats/asset_data (2011-)',
    url: 'https://www.macrotrends.net/2593/nikkei-225-index-historical-chart-data',
    license: 'informational use, attribution: www.macrotrends.net',
    retrievedAt: '2026-07-06',
    note: '日次終値から月末終値を抽出。配当を含まない価格指数',
  },
  ...nikkei,
});

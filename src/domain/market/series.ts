/**
 * 月ID計算・系列アライン・リターン計算
 */
import type { AssetId, Market, MonthId, SeriesJson } from '../types';

export function monthAdd(month: MonthId, delta: number): MonthId {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

export function monthDiff(a: MonthId, b: MonthId): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by * 12 + bm) - (ay * 12 + am);
}

/**
 * 複数系列を共通期間（積集合）にアラインする。
 * 全資産が揃う期間だけを旅の舞台にするため、開始は最も遅いstart、
 * 終了は最も早いendに切り詰める。
 */
export function buildMarket(seriesList: SeriesJson[]): Market {
  if (seriesList.length === 0) throw new Error('no series');
  const start = seriesList
    .map((s) => s.startMonth)
    .reduce((a, b) => (monthDiff(a, b) < 0 ? a : b)); // 最も遅い開始月
  const end = seriesList
    .map((s) => monthAdd(s.startMonth, s.prices.length - 1))
    .reduce((a, b) => (monthDiff(a, b) < 0 ? b : a)); // 最も早い終了月
  const months = monthDiff(start, end) + 1;
  if (months <= 0) throw new Error('series do not overlap');

  const prices = {} as Record<AssetId, number[]>;
  for (const s of seriesList) {
    const offset = monthDiff(s.startMonth, start);
    prices[s.id] = s.prices.slice(offset, offset + months);
  }
  return { startMonth: start, months, prices };
}

/** Market上のインデックス→月ID */
export function monthAt(market: Market, index: number): MonthId {
  return monthAdd(market.startMonth, index);
}

/** i-1月からi月への単月リターン（i>=1） */
export function monthlyReturn(market: Market, asset: AssetId, i: number): number {
  const p = market.prices[asset];
  return p[i] / p[i - 1] - 1;
}

/** 系列の[from..to]区間の最大ドローダウン（負値で返す。下落がなければ0） */
export function maxDrawdown(prices: number[], from: number, to: number): number {
  let peak = -Infinity;
  let worst = 0;
  for (let i = from; i <= to; i++) {
    if (prices[i] > peak) peak = prices[i];
    const dd = prices[i] / peak - 1;
    if (dd < worst) worst = dd;
  }
  return worst;
}

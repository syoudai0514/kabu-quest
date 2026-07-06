/**
 * 帰還時のスコアリング: メダル・星・どんぐり
 *
 * 設計原則（GDD §7）: 星は「同じ旅をちょきんばこだけで過ごした場合」との比較。
 * 相場は選べない、行動は選べる——市況でなく行動を評価する。
 */
import type { CashRateProvider, Market } from '../types';
import { ASSET_IDS } from '../types';
import { simulateScript, type RunState } from '../engine/run';
import { maxDrawdown } from '../market/series';

export type MedalId =
  | 'gaman' // がまんメダル: パニックで耐え、資産が回復した
  | 'yuki' // ゆうきメダル: パニックで買い、そこが底値圏だった
  | 'kotsukotsu' // こつこつ賞: つみたてを旅の半分以上つづけた
  | 'tamagoWake' // たまごわけ名人: 分散スコア平均が高い
  | 'fukkatsu' // ふっかつ賞: -30%から入金額以上まで復活
  | 'kanso'; // ぜんぶへっても わらった賞: 大きな損で旅を完走

export interface RunScore {
  finalValue: number;
  invested: number;
  /** ちょきんばこだけベンチマークの最終額 */
  cashOnlyFinal: number;
  stars: 1 | 2 | 3 | 4 | 5;
  medals: MedalId[];
  acorns: number;
}

/** 底値圏とみなす範囲: 窓内最安値から+2ヶ月以内 */
const BOTTOM_TOLERANCE_MONTHS = 2;

export function scoreRun(state: RunState, market: Market, rates: CashRateProvider): RunScore {
  const finalValue = state.valueHistory[state.valueHistory.length - 1];
  const cashOnly = simulateScript(market, state.cfg, [], new Map(), rates);
  const cashOnlyFinal = cashOnly[cashOnly.length - 1];

  const medals = judgeMedals(state, market);
  const stars = judgeStars(finalValue / cashOnlyFinal);
  const acorns = calcAcorns(finalValue, medals);
  return { finalValue, invested: state.invested, cashOnlyFinal, stars, medals, acorns };
}

function judgeStars(ratio: number): RunScore['stars'] {
  if (ratio < 0.85) return 1;
  if (ratio < 1.0) return 2;
  if (ratio < 1.15) return 3;
  if (ratio < 1.35) return 4;
  return 5;
}

/**
 * どんぐり = 資産ベース + メダルボーナス。がまんメダルは全体を1.5倍（GDD §7:
 * 「儲け＜行動」の報酬構造にするため、メダルの寄与を大きくする）
 */
function calcAcorns(finalValue: number, medals: MedalId[]): number {
  const base = Math.floor(finalValue / 2000);
  const medalBonus = medals.filter((m) => m !== 'gaman').length * 8;
  const total = base + medalBonus;
  return Math.round(medals.includes('gaman') ? total * 1.5 : total);
}

function judgeMedals(state: RunState, market: Market): MedalId[] {
  const medals: MedalId[] = [];
  const { startIndex, lengthMonths } = state.cfg;
  const endIdx = startIndex + lengthMonths;
  const finalValue = state.valueHistory[state.valueHistory.length - 1];

  // がまんメダル: 耐えた/買ったパニックがあり、その資産が旅の終わりまでに
  // パニック時点の95%以上へ回復した
  for (const p of state.panics) {
    if (p.choice !== 'hold' && p.choice !== 'buy') continue;
    const priceAtPanic = market.prices[p.asset][startIndex + p.turn];
    const priceAtEnd = market.prices[p.asset][endIdx];
    if (priceAtEnd >= priceAtPanic * 0.95) {
      medals.push('gaman');
      break;
    }
  }

  // ゆうきメダル: 「かいます」を選び、そこが底値圏（窓内最安値±2ヶ月）だった
  for (const p of state.panics) {
    if (p.choice !== 'buy') continue;
    const prices = market.prices[p.asset];
    let bottomIdx = startIndex;
    for (let i = startIndex; i <= endIdx; i++) {
      if (prices[i] < prices[bottomIdx]) bottomIdx = i;
    }
    if (Math.abs(startIndex + p.turn - bottomIdx) <= BOTTOM_TOLERANCE_MONTHS) {
      medals.push('yuki');
      break;
    }
  }

  // こつこつ賞: つみたてONの期間が旅の半分以上
  if (tsumitateMonths(state) >= lengthMonths / 2) medals.push('kotsukotsu');

  // たまごわけ名人: たまごわけスコアの旅平均が0.5以上
  const avgEgg = state.eggHistory.reduce((a, b) => a + b, 0) / state.eggHistory.length;
  if (avgEgg >= 0.5) medals.push('tamagoWake');

  // ふっかつ賞: ポートフォリオが-30%を経験し、最終的に入金額以上へ
  const dd = maxDrawdown(state.valueHistory, 0, state.valueHistory.length - 1);
  if (dd <= -0.3 && finalValue >= state.invested) medals.push('fukkatsu');

  // ぜんぶへっても わらった賞: 入金額の7割未満で完走（失敗の収集要素化。GDD §6.8）
  if (finalValue < state.invested * 0.7) medals.push('kanso');

  return medals;
}

function tsumitateMonths(state: RunState): number {
  let on = false;
  let from = 0;
  let total = 0;
  for (const a of state.actions) {
    if (a.type !== 'tsumitate') continue;
    if (a.on && !on) {
      on = true;
      from = a.turn;
    } else if (!a.on && on) {
      on = false;
      total += a.turn - from;
    }
  }
  if (on) total += state.cfg.lengthMonths - from;
  return total;
}

/** ぜんりょくベンチマーク（親ダッシュボード・おとなモード用の参考線） */
export function benchmarkAllIn(
  state: RunState,
  market: Market,
  rates: CashRateProvider,
  asset: (typeof ASSET_IDS)[number],
): number[] {
  return simulateScript(
    market,
    state.cfg,
    [
      { type: 'buy', turn: 0, asset, amount: state.cfg.initialCash },
      { type: 'tsumitate', turn: 0, on: true },
    ],
    new Map(),
    rates,
  );
}

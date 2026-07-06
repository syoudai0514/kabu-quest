/**
 * タイムマシンの「窓」抽選
 *
 * 窓 = Market上の連続 lengthMonths+1 ヶ月（価格点がlen+1個 → リターンがlen個）。
 * 純ランダムだと上げ相場に偏り我慢メカニクスが発動しないため、
 * 窓を3タイプに分類して重み付き抽選する（GDD §6.1。意図的バイアス）。
 */
import type { Market } from '../types';
import { ASSET_IDS } from '../types';
import { maxDrawdown, monthlyReturn } from './series';
import type { Rng } from './rng';

export type WindowType = 'calm' | 'climb' | 'storm';

/** パニックン発動と同じ閾値（GDD §6.3）。窓分類にも使う */
export const PANIC_MONTHLY_DROP = -0.08;
export const PANIC_DRAWDOWN = -0.2;

/** 「のぼり坂」判定: 両資産平均の窓トータルリターンがこの値以上（24ヶ月基準） */
const CLIMB_TOTAL_RETURN = 0.2;

export const DEFAULT_WEIGHTS: Record<WindowType, number> = {
  calm: 0.4,
  climb: 0.3,
  storm: 0.3,
};

export function classifyWindow(market: Market, start: number, lengthMonths: number): WindowType {
  const end = start + lengthMonths;
  for (const asset of ASSET_IDS) {
    for (let i = start + 1; i <= end; i++) {
      if (monthlyReturn(market, asset, i) <= PANIC_MONTHLY_DROP) return 'storm';
    }
    if (maxDrawdown(market.prices[asset], start, end) <= PANIC_DRAWDOWN) return 'storm';
  }
  const avgTotal =
    ASSET_IDS.reduce(
      (sum, a) => sum + (market.prices[a][end] / market.prices[a][start] - 1),
      0,
    ) / ASSET_IDS.length;
  // 24ヶ月以外の長さでは閾値を期間比例でスケール
  if (avgTotal >= CLIMB_TOTAL_RETURN * (lengthMonths / 24)) return 'climb';
  return 'calm';
}

export interface WindowCandidate {
  start: number;
  type: WindowType;
}

export function listWindows(market: Market, lengthMonths: number): WindowCandidate[] {
  const out: WindowCandidate[] = [];
  for (let start = 0; start + lengthMonths < market.months; start++) {
    out.push({ start, type: classifyWindow(market, start, lengthMonths) });
  }
  return out;
}

export interface DrawOptions {
  /** 直近の旅の開始インデックス。重なる窓は候補から除外（GDD §6.1） */
  recentStarts?: number[];
  weights?: Record<WindowType, number>;
}

/**
 * 重み付き窓抽選。
 * 1) タイプを重みで抽選（そのタイプの候補が空なら残りで再抽選）
 * 2) タイプ内から一様に選ぶ
 */
export function drawWindow(
  rng: Rng,
  market: Market,
  lengthMonths: number,
  opts: DrawOptions = {},
): WindowCandidate {
  const weights = opts.weights ?? DEFAULT_WEIGHTS;
  const recent = opts.recentStarts ?? [];
  const all = listWindows(market, lengthMonths);
  const available = all.filter(
    (w) => !recent.some((r) => Math.abs(r - w.start) < lengthMonths),
  );
  const pool = available.length > 0 ? available : all;

  const byType: Record<WindowType, WindowCandidate[]> = { calm: [], climb: [], storm: [] };
  for (const w of pool) byType[w.type].push(w);

  const types = (Object.keys(byType) as WindowType[]).filter((t) => byType[t].length > 0);
  const totalW = types.reduce((s, t) => s + weights[t], 0);
  let r = rng() * totalW;
  let chosen: WindowType = types[types.length - 1];
  for (const t of types) {
    r -= weights[t];
    if (r <= 0) {
      chosen = t;
      break;
    }
  }
  const list = byType[chosen];
  return list[Math.floor(rng() * list.length)];
}

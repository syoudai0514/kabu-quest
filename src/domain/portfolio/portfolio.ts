/**
 * ポートフォリオ操作と分散スコア
 */
import type { AssetId, Holdings } from '../types';
import { ASSET_IDS } from '../types';

export function totalValue(h: Holdings): number {
  return h.sp500 + h.nikkei225 + h.cash;
}

export function riskyValue(h: Holdings): number {
  return h.sp500 + h.nikkei225;
}

/** 現金→資産の購入。現金が足りなければあるだけ買う（clamp）。買えた額を返す */
export function buy(h: Holdings, asset: AssetId, amount: number): { next: Holdings; bought: number } {
  const bought = Math.max(0, Math.min(amount, h.cash));
  return { next: { ...h, cash: h.cash - bought, [asset]: h[asset] + bought }, bought };
}

/** 資産→現金の売却。保有が足りなければあるだけ売る */
export function sell(h: Holdings, asset: AssetId, amount: number): { next: Holdings; sold: number } {
  const sold = Math.max(0, Math.min(amount, h[asset]));
  return { next: { ...h, cash: h.cash + sold, [asset]: h[asset] - sold }, sold };
}

/** 各リスク資産に月次リターンを適用し、現金に月次金利を適用する */
export function applyReturns(
  h: Holdings,
  returns: Record<AssetId, number>,
  cashMonthlyRate: number,
): Holdings {
  const next: Holdings = { ...h, cash: h.cash * (1 + cashMonthlyRate) };
  for (const a of ASSET_IDS) next[a] = h[a] * (1 + returns[a]);
  return next;
}

/**
 * ハーフィンダール指数（HHI）。現金含む3資産の集中度。
 * 1=全額一点集中、1/3=完全三等分。資産ゼロ時は1（集中扱い）を返す。
 */
export function hhi(h: Holdings): number {
  const total = totalValue(h);
  if (total <= 0) return 1;
  const shares = [h.sp500, h.nikkei225, h.cash].map((v) => v / total);
  return shares.reduce((s, x) => s + x * x, 0);
}

/**
 * たまごわけスコア（0〜1）。HHIを「1点集中=0、完全分散=1」に正規化。
 * 子ども向けUI・親ダッシュボードの共通指標。
 */
export function eggScore(h: Holdings): number {
  const n = 3;
  return (1 - hhi(h)) / (1 - 1 / n);
}

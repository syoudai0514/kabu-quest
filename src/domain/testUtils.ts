/** テスト用の合成マーケット生成ヘルパ */
import type { Market } from './types';

export function makeMarket(sp500: number[], nikkei225: number[], startMonth = '2000-01'): Market {
  if (sp500.length !== nikkei225.length) throw new Error('length mismatch');
  return { startMonth, months: sp500.length, prices: { sp500, nikkei225 } };
}

/** 一定率で毎月成長する系列 */
export function growth(start: number, monthlyRate: number, months: number): number[] {
  const out = [start];
  for (let i = 1; i < months; i++) out.push(out[i - 1] * (1 + monthlyRate));
  return out;
}

export function flat(value: number, months: number): number[] {
  return Array(months).fill(value);
}

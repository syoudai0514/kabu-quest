import { describe, expect, it } from 'vitest';
import { applyReturns, buy, eggScore, hhi, sell, totalValue } from './portfolio';
import type { Holdings } from '../types';

const h = (sp500: number, nikkei225: number, cash: number): Holdings => ({ sp500, nikkei225, cash });

describe('buy/sell', () => {
  it('clamps buy to available cash', () => {
    const { next, bought } = buy(h(0, 0, 1500), 'sp500', 2000);
    expect(bought).toBe(1500);
    expect(next).toEqual(h(1500, 0, 0));
  });
  it('clamps sell to holdings', () => {
    const { next, sold } = sell(h(800, 0, 0), 'sp500', 1000);
    expect(sold).toBe(800);
    expect(next).toEqual(h(0, 0, 800));
  });
});

describe('applyReturns', () => {
  it('applies asset returns and cash interest', () => {
    const next = applyReturns(h(1000, 2000, 3000), { sp500: 0.1, nikkei225: -0.5 }, 0.01);
    expect(next.sp500).toBeCloseTo(1100);
    expect(next.nikkei225).toBeCloseTo(1000);
    expect(next.cash).toBeCloseTo(3030);
    expect(totalValue(next)).toBeCloseTo(5130);
  });
});

describe('hhi / eggScore', () => {
  it('is 1 (concentrated) for all-in and 1/3 for perfect split', () => {
    expect(hhi(h(0, 0, 9000))).toBe(1);
    expect(hhi(h(3000, 3000, 3000))).toBeCloseTo(1 / 3);
  });
  it('eggScore normalizes to 0..1', () => {
    expect(eggScore(h(0, 0, 9000))).toBe(0);
    expect(eggScore(h(3000, 3000, 3000))).toBeCloseTo(1);
  });
});

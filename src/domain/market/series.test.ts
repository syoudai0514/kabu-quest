import { describe, expect, it } from 'vitest';
import { buildMarket, maxDrawdown, monthAdd, monthDiff, monthlyReturn, monthAt } from './series';
import type { SeriesJson } from '../types';

const src = { name: 't', url: 't', retrievedAt: 't' };

describe('month math', () => {
  it('monthAdd handles year boundaries', () => {
    expect(monthAdd('1999-12', 1)).toBe('2000-01');
    expect(monthAdd('2000-01', -1)).toBe('1999-12');
    expect(monthAdd('1985-01', 23)).toBe('1986-12');
  });
  it('monthDiff is inverse of monthAdd', () => {
    expect(monthDiff('1985-01', '1990-06')).toBe(65);
    expect(monthAdd('1985-01', 65)).toBe('1990-06');
  });
});

describe('buildMarket', () => {
  it('aligns series to the overlapping range', () => {
    const a: SeriesJson = {
      id: 'sp500', startMonth: '2000-01', prices: [1, 2, 3, 4, 5], methodology: '', source: src,
    };
    const b: SeriesJson = {
      id: 'nikkei225', startMonth: '2000-03', prices: [30, 40, 50, 60], methodology: '', source: src,
    };
    const m = buildMarket([a, b]);
    expect(m.startMonth).toBe('2000-03');
    expect(m.months).toBe(3); // 2000-03..2000-05
    expect(m.prices.sp500).toEqual([3, 4, 5]);
    expect(m.prices.nikkei225).toEqual([30, 40, 50]);
    expect(monthAt(m, 2)).toBe('2000-05');
  });
});

describe('monthlyReturn / maxDrawdown', () => {
  it('computes simple returns', () => {
    const m = buildMarket([
      { id: 'sp500', startMonth: '2000-01', prices: [100, 110, 99], methodology: '', source: src },
      { id: 'nikkei225', startMonth: '2000-01', prices: [1, 1, 1], methodology: '', source: src },
    ]);
    expect(monthlyReturn(m, 'sp500', 1)).toBeCloseTo(0.1);
    expect(monthlyReturn(m, 'sp500', 2)).toBeCloseTo(-0.1);
  });
  it('maxDrawdown finds worst peak-to-trough', () => {
    expect(maxDrawdown([100, 120, 90, 110, 80], 0, 4)).toBeCloseTo(80 / 120 - 1);
    expect(maxDrawdown([100, 110, 120], 0, 2)).toBe(0);
  });
});

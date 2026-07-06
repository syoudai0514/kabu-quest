import { describe, expect, it } from 'vitest';
import { classifyWindow, drawWindow, listWindows } from './window';
import { mulberry32 } from './rng';
import { flat, growth, makeMarket } from '../testUtils';

describe('classifyWindow', () => {
  it('detects storm via single-month -8% drop', () => {
    const sp = [100, 100, 91, 100, ...flat(100, 22)]; // -9% at i=2
    const m = makeMarket(sp, flat(50, sp.length));
    expect(classifyWindow(m, 0, 24)).toBe('storm');
  });
  it('detects storm via -20% drawdown even without single-month crash', () => {
    // 毎月-4%が6ヶ月 → 累積-21.7%（単月では閾値未満）
    const sp = [100, ...growth(96, -0.04, 6), ...flat(78, 19)];
    const m = makeMarket(sp.slice(0, 26), flat(50, 26));
    expect(classifyWindow(m, 0, 24)).toBe('storm');
  });
  it('classifies climb when both assets rise ~20%+', () => {
    const m = makeMarket(growth(100, 0.01, 26), growth(50, 0.01, 26));
    expect(classifyWindow(m, 0, 24)).toBe('climb');
  });
  it('classifies calm otherwise', () => {
    const m = makeMarket(flat(100, 26), flat(50, 26));
    expect(classifyWindow(m, 0, 24)).toBe('calm');
  });
});

describe('drawWindow', () => {
  it('is deterministic for a given seed and excludes recent overlapping windows', () => {
    const m = makeMarket(growth(100, 0.005, 80), growth(50, 0.002, 80));
    const w1 = drawWindow(mulberry32(42), m, 24);
    const w2 = drawWindow(mulberry32(42), m, 24);
    expect(w1).toEqual(w2);

    const excluded = drawWindow(mulberry32(7), m, 24, { recentStarts: [w1.start] });
    expect(Math.abs(excluded.start - w1.start)).toBeGreaterThanOrEqual(24);
  });
  it('lists a window for every valid start index', () => {
    const m = makeMarket(flat(100, 30), flat(50, 30));
    expect(listWindows(m, 24)).toHaveLength(30 - 24);
  });
});

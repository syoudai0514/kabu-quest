import { describe, expect, it } from 'vitest';
import { advance, createRun, doBuy, resolvePanic, setTsumitate } from '../engine/run';
import { scoreRun } from './scoring';
import { buildMoshimo } from './moshimo';
import { zeroRate } from '../rates/cashRate';
import { flat, growth, makeMarket } from '../testUtils';
import type { RunConfig } from '../types';

const cfg = (over: Partial<RunConfig> = {}): RunConfig => ({
  startIndex: 0,
  lengthMonths: 24,
  initialCash: 10000,
  monthlyAllowance: 1000,
  seed: 1,
  ...over,
});

/** 暴落→回復のV字相場。i=2で-15%、その後回復して最終的に上回る */
function vShapeMarket() {
  const sp = [100, 100, 85, 80, 85, 92, 100, ...growth(105, 0.02, 23)];
  return makeMarket(sp.slice(0, 30), flat(50, 30));
}

function playVShape(choice: 'hold' | 'sell' | 'buy') {
  const m = vShapeMarket();
  let s = createRun(cfg());
  s = doBuy(s, 'sp500', 10000);
  for (let i = 0; i < 24; i++) {
    s = advance(s, m, zeroRate);
    if (s.pendingPanic) s = resolvePanic(s, choice);
  }
  return { s, m };
}

describe('scoreRun', () => {
  it('awards gaman medal (and 1.5x acorns) for holding through a recovering crash', () => {
    const { s, m } = playVShape('hold');
    const score = scoreRun(s, m, zeroRate);
    expect(score.medals).toContain('gaman');
    const base = Math.floor(score.finalValue / 2000) + score.medals.filter((x) => x !== 'gaman').length * 8;
    expect(score.acorns).toBe(Math.round(base * 1.5));
  });

  it('awards yuki medal for buying near the bottom', () => {
    const { s, m } = playVShape('buy');
    const score = scoreRun(s, m, zeroRate);
    expect(score.medals).toContain('yuki');
  });

  it('gives no gaman medal when the player sold', () => {
    const { s, m } = playVShape('sell');
    const score = scoreRun(s, m, zeroRate);
    expect(score.medals).not.toContain('gaman');
  });

  it('stars compare against cash-only benchmark', () => {
    // 強い上げ相場に全額投資 → ★5（おこづかい0で比率を純粋にする）
    const m = makeMarket(growth(100, 0.03, 30), growth(50, 0.03, 30));
    let s = createRun(cfg({ monthlyAllowance: 0 }));
    s = doBuy(s, 'sp500', 10000);
    for (let i = 0; i < 24; i++) s = advance(s, m, zeroRate);
    const score = scoreRun(s, m, zeroRate);
    expect(score.cashOnlyFinal).toBe(10000);
    expect(score.stars).toBe(5);
  });

  it('awards kotsukotsu for keeping tsumitate on and kanso for big losses', () => {
    // ずっと下げ相場
    const m = makeMarket(growth(100, -0.05, 30), growth(50, -0.05, 30));
    let s = createRun(cfg());
    s = doBuy(s, 'sp500', 10000);
    s = setTsumitate(s, true);
    for (let i = 0; i < 24; i++) {
      s = advance(s, m, zeroRate);
      if (s.pendingPanic) s = resolvePanic(s, 'hold');
    }
    const score = scoreRun(s, m, zeroRate);
    expect(score.medals).toContain('kotsukotsu');
    expect(score.medals).toContain('kanso');
  });
});

describe('buildMoshimo', () => {
  it('shows the if-held line when the player panic-sold, and it ends higher in a V-shape', () => {
    const { s, m } = playVShape('sell');
    const moshimo = buildMoshimo(s, m, zeroRate);
    expect(moshimo.kind).toBe('ifHeld');
    expect(moshimo.values[24]).toBeGreaterThan(s.valueHistory[24]);
  });

  it('shows the if-sold line when the player held', () => {
    const { s, m } = playVShape('hold');
    const moshimo = buildMoshimo(s, m, zeroRate);
    expect(moshimo.kind).toBe('ifSold');
    expect(moshimo.values[24]).toBeLessThan(s.valueHistory[24]);
  });

  it('if-sold world also stops tsumitate after the panic sell', () => {
    const m = vShapeMarket();
    let s = createRun(cfg());
    s = doBuy(s, 'sp500', 10000);
    s = setTsumitate(s, true);
    for (let i = 0; i < 24; i++) {
      s = advance(s, m, zeroRate);
      if (s.pendingPanic) s = resolvePanic(s, 'hold');
    }
    const moshimo = buildMoshimo(s, m, zeroRate);
    expect(moshimo.kind).toBe('ifSold');
    // 売却後は現金のみ: 各月の増分がおこづかい1000円ちょうどになる
    const panicTurn = s.panics[0].turn;
    for (let t = panicTurn + 1; t < 23; t++) {
      expect(moshimo.values[t + 1] - moshimo.values[t]).toBeCloseTo(1000);
    }
  });

  it('shows if-invested for a cash-only player', () => {
    const m = makeMarket(growth(100, 0.02, 30), growth(50, 0.02, 30));
    let s = createRun(cfg());
    for (let i = 0; i < 24; i++) s = advance(s, m, zeroRate);
    const moshimo = buildMoshimo(s, m, zeroRate);
    expect(moshimo.kind).toBe('ifInvested');
    expect(moshimo.values[24]).toBeGreaterThan(s.valueHistory[24]);
  });
});

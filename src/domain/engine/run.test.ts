import { describe, expect, it } from 'vitest';
import { advance, createRun, doBuy, resolvePanic, setTsumitate, simulateScript } from './run';
import { zeroRate, fixedAnnualRate } from '../rates/cashRate';
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

const CALM = makeMarket(flat(100, 30), flat(50, 30));

describe('advance', () => {
  it('applies returns then adds allowance', () => {
    // sp500が毎月+10%
    const m = makeMarket(growth(100, 0.1, 30), flat(50, 30));
    let s = createRun(cfg());
    s = doBuy(s, 'sp500', 10000);
    s = advance(s, m, zeroRate);
    // 10000*1.1 + おこづかい1000
    expect(s.valueHistory[1]).toBeCloseTo(12000);
    expect(s.holdings.sp500).toBeCloseTo(11000);
    expect(s.holdings.cash).toBeCloseTo(1000);
    expect(s.invested).toBe(11000);
  });

  it('applies cash interest through the rate provider', () => {
    let s = createRun(cfg({ lengthMonths: 1 }));
    s = advance(s, CALM, fixedAnnualRate(0.12));
    // 最終ターンはおこづかいなし。10000 * (1.12)^(1/12)
    expect(s.holdings.cash).toBeCloseTo(10000 * Math.pow(1.12, 1 / 12));
    expect(s.finished).toBe(true);
  });

  it('tsumitate auto-invests the allowance 50/50', () => {
    let s = createRun(cfg());
    s = setTsumitate(s, true);
    s = advance(s, CALM, zeroRate);
    expect(s.holdings.sp500).toBe(500);
    expect(s.holdings.nikkei225).toBe(500);
    expect(s.holdings.cash).toBe(10000);
  });

  it('finishes exactly at lengthMonths with full value history', () => {
    let s = createRun(cfg({ lengthMonths: 24 }));
    for (let i = 0; i < 24; i++) s = advance(s, CALM, zeroRate);
    expect(s.finished).toBe(true);
    expect(s.valueHistory).toHaveLength(25);
    // 現金のみ: 初期10000 + おこづかい23回（最終月は入金なし）
    expect(s.valueHistory[24]).toBe(10000 + 23 * 1000);
    // finished後のadvanceは何もしない
    expect(advance(s, CALM, zeroRate)).toBe(s);
  });
});

describe('panic detection', () => {
  it('triggers on a held asset dropping more than 8% in a month', () => {
    const m = makeMarket([100, 90, ...flat(90, 28)], flat(50, 30)); // -10%
    let s = createRun(cfg());
    s = doBuy(s, 'sp500', 10000);
    s = advance(s, m, zeroRate);
    expect(s.pendingPanic).not.toBeNull();
    expect(s.pendingPanic!.asset).toBe('sp500');
    expect(s.pendingPanic!.trigger).toBe('monthlyDrop');
    // 選択するまで進めない
    expect(advance(s, m, zeroRate)).toBe(s);
  });

  it('does not trigger when the player holds no risky assets', () => {
    const m = makeMarket([100, 90, ...flat(90, 28)], flat(50, 30));
    let s = createRun(cfg());
    s = advance(s, m, zeroRate);
    expect(s.pendingPanic).toBeNull();
  });

  it('triggers on portfolio drawdown of 20% without a single-month crash', () => {
    // 毎月-7%: 単月では発動しないが4ヶ月目に累積-25%。
    // おこづかい入金はポートフォリオDDを覆い隠すため0にして検証する
    const sp = growth(100, -0.07, 30);
    const m = makeMarket(sp, flat(50, 30));
    let s = createRun(cfg({ monthlyAllowance: 0 }));
    s = doBuy(s, 'sp500', 10000);
    while (!s.pendingPanic && !s.finished) s = advance(s, m, zeroRate);
    expect(s.pendingPanic).not.toBeNull();
    expect(s.pendingPanic!.trigger).toBe('drawdown');
  });

  it('respects cooldown between battles', () => {
    // 毎月-10%が続く相場
    const m = makeMarket(growth(100, -0.1, 30), flat(50, 30));
    let s = createRun(cfg());
    s = doBuy(s, 'sp500', 10000);
    s = advance(s, m, zeroRate);
    const firstPanicTurn = s.panics[0].turn;
    s = resolvePanic(s, 'hold');
    s = advance(s, m, zeroRate); // クールダウン中
    expect(s.pendingPanic).toBeNull();
    s = advance(s, m, zeroRate);
    s = advance(s, m, zeroRate);
    expect(s.pendingPanic).not.toBeNull();
    expect(s.panics[1].turn - firstPanicTurn).toBeGreaterThanOrEqual(3);
  });
});

describe('resolvePanic', () => {
  function panickedState() {
    const m = makeMarket([100, 90, ...flat(90, 28)], flat(50, 30));
    let s = createRun(cfg());
    s = doBuy(s, 'sp500', 5000);
    s = doBuy(s, 'nikkei225', 2000);
    s = advance(s, m, zeroRate);
    return s;
  }
  it('sell liquidates all risky assets', () => {
    const s = resolvePanic(panickedState(), 'sell');
    expect(s.holdings.sp500).toBe(0);
    expect(s.holdings.nikkei225).toBe(0);
    expect(s.holdings.cash).toBeCloseTo(3000 + 1000 + 4500 + 2000);
    expect(s.panics[0].choice).toBe('sell');
    expect(s.pendingPanic).toBeNull();
  });
  it('buy puts all cash into the crashed asset', () => {
    const s = resolvePanic(panickedState(), 'buy');
    expect(s.holdings.cash).toBe(0);
    expect(s.holdings.sp500).toBeCloseTo(4500 + 4000);
  });
  it('hold changes nothing but records the choice', () => {
    const before = panickedState();
    const s = resolvePanic(before, 'hold');
    expect(s.holdings).toEqual(before.holdings);
    expect(s.panics[0].choice).toBe('hold');
  });
});

describe('simulateScript', () => {
  it('replays the recorded actions to the same value history as live play', () => {
    const m = makeMarket(growth(100, 0.02, 30), growth(50, -0.01, 30));
    let live = createRun(cfg());
    live = doBuy(live, 'sp500', 4000);
    live = setTsumitate(live, true);
    for (let i = 0; i < 24; i++) {
      live = advance(live, m, zeroRate);
      if (live.pendingPanic) live = resolvePanic(live, 'hold');
    }
    const replay = simulateScript(m, cfg(), live.actions, new Map(), zeroRate);
    expect(replay).toEqual(live.valueHistory);
  });

  it('empty script equals cash-only benchmark', () => {
    const values = simulateScript(CALM, cfg(), [], new Map(), zeroRate);
    expect(values[24]).toBe(10000 + 23 * 1000);
  });
});

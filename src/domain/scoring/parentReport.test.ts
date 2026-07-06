import { describe, expect, it } from 'vitest';
import { buildParentReport, conversationCard, type RunLogEntry } from './parentReport';

function entry(over: Partial<RunLogEntry> = {}): RunLogEntry {
  return {
    at: '2026-07-06T00:00:00Z',
    lengthMonths: 24,
    startMonth: '2008-01',
    eventIds: ['lehman2008'],
    panics: [],
    avgCashRatio: 0.5,
    avgEggScore: 0.4,
    finalValue: 30000,
    invested: 33000,
    stars: 3,
    medals: [],
    acorns: 15,
    tsumitateUsed: false,
    ...over,
  };
}

describe('buildParentReport', () => {
  it('returns an empty report for no runs', () => {
    const r = buildParentReport([]);
    expect(r.runCount).toBe(0);
    expect(r.card).toBeNull();
  });

  it('aggregates panic wins/losses and risk style across runs', () => {
    const r = buildParentReport([
      entry({
        panics: [
          { turn: 3, asset: 'sp500', trigger: 'monthlyDrop', severity: -0.1, choice: 'hold' },
          { turn: 9, asset: 'nikkei225', trigger: 'drawdown', severity: -0.22, choice: 'sell' },
        ],
        avgCashRatio: 0.2,
      }),
      entry({
        panics: [{ turn: 5, asset: 'sp500', trigger: 'monthlyDrop', severity: -0.09, choice: 'buy' }],
        avgCashRatio: 0.4,
      }),
    ]);
    expect(r.panicRecord).toEqual({ wins: 2, losses: 1 });
    expect(r.riskStyle).toBeCloseTo(1 - 0.3);
    expect(r.experiencedEvents).toEqual(['lehman2008']);
  });
});

describe('conversationCard', () => {
  it('asks about the reason for holding after a panic win', () => {
    const card = conversationCard(
      entry({
        panics: [{ turn: 3, asset: 'sp500', trigger: 'monthlyDrop', severity: -0.1, choice: 'hold' }],
      }),
    );
    expect(card).toContain('リーマンショック');
    expect(card).toContain('がまん');
  });

  it('never blames the child for panic selling', () => {
    const card = conversationCard(
      entry({
        panics: [{ turn: 3, asset: 'sp500', trigger: 'monthlyDrop', severity: -0.1, choice: 'sell' }],
      }),
    );
    expect(card).toContain('責めずに');
  });

  it('falls back to a waiting question on a calm run', () => {
    const card = conversationCard(entry({ eventIds: [], finalValue: 34000 }));
    expect(card).toContain('まって');
  });
});

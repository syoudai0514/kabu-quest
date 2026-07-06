/**
 * 同梱実データのスモークテスト。
 * 既知の歴史的事実と突き合わせ、データ生成パイプラインの破損を検知する。
 */
import { describe, expect, it } from 'vitest';
import sp500 from '../data/generated/sp500.json';
import nikkei from '../data/generated/nikkei225.json';
import { buildMarket, monthDiff, monthlyReturn } from './market/series';
import { classifyWindow } from './market/window';
import { matchEvents } from './events/history';
import type { SeriesJson } from './types';

const market = buildMarket([sp500 as SeriesJson, nikkei as SeriesJson]);

function idx(month: string): number {
  return monthDiff(market.startMonth, month);
}

describe('bundled market data', () => {
  it('starts 1985-01 and has 470+ aligned months', () => {
    expect(market.startMonth).toBe('1985-01');
    expect(market.months).toBeGreaterThan(470);
  });

  it('has no gaps, zeros or negative prices', () => {
    for (const prices of [market.prices.sp500, market.prices.nikkei225]) {
      expect(prices).toHaveLength(market.months);
      for (const p of prices) expect(p).toBeGreaterThan(0);
    }
  });

  it('nikkei bubble peak: 1989-12 month-end close is 38915.87', () => {
    expect(market.prices.nikkei225[idx('1989-12')]).toBeCloseTo(38915.87);
  });

  it('lehman shock: nikkei fell more than 20% in 2008-10', () => {
    expect(monthlyReturn(market, 'nikkei225', idx('2008-10'))).toBeLessThan(-0.2);
  });

  it('covid crash: sp500 fell more than 8% in 2020-03 (Shiller monthly avg)', () => {
    expect(monthlyReturn(market, 'sp500', idx('2020-03'))).toBeLessThan(-0.08);
  });

  it('a window containing lehman is classified as storm', () => {
    expect(classifyWindow(market, idx('2007-06'), 24)).toBe('storm');
  });

  it('matchEvents finds lehman for a window over 2008', () => {
    const events = matchEvents('2007-06', 24);
    expect(events.map((e) => e.id)).toContain('lehman2008');
    // 主役は優先度最大のリーマン
    expect(events[0].id).toBe('lehman2008');
  });

  it('sensitive events can be excluded', () => {
    const withS = matchEvents('2011-01', 12);
    const withoutS = matchEvents('2011-01', 12, { includeSensitive: false });
    expect(withS.map((e) => e.id)).toContain('tohoku2011');
    expect(withoutS.map((e) => e.id)).not.toContain('tohoku2011');
  });
});

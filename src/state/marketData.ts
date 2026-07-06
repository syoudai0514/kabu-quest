/**
 * 同梱データからMarketを一度だけ構築するシングルトン。
 * データ取得層の差し替え（API化・銘柄追加）はここを入口に行う。
 */
import sp500 from '../data/generated/sp500.json';
import nikkei225 from '../data/generated/nikkei225.json';
import { buildMarket } from '../domain/market/series';
import type { Market, SeriesJson } from '../domain/types';
import { zeroRate } from '../domain/rates/cashRate';
import type { CashRateProvider } from '../domain/types';

let cached: Market | null = null;

export function getMarket(): Market {
  if (!cached) {
    cached = buildMarket([sp500 as SeriesJson, nikkei225 as SeriesJson]);
  }
  return cached;
}

/** v1は0%固定。時代連動化は docs/HANDOFF.md §1 */
export function getCashRates(): CashRateProvider {
  return zeroRate;
}

export const DATA_SOURCES = [
  { label: 'S&P500', ...(sp500 as SeriesJson).source, methodology: (sp500 as SeriesJson).methodology },
  { label: '日経平均', ...(nikkei225 as SeriesJson).source, methodology: (nikkei225 as SeriesJson).methodology },
];

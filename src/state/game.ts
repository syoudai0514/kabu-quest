/**
 * 進行中の旅＋画面遷移のストア。
 * domainエンジンへの橋渡し（オーケストレーション）はここに集約し、
 * UIコンポーネントはこのストアのアクションだけを呼ぶ。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AssetId, PanicChoice, RunConfig } from '../domain/types';
import {
  advance,
  createRun,
  doBuy,
  doSell,
  resolvePanic,
  setTsumitate,
  type RunState,
} from '../domain/engine/run';
import { drawWindow, type WindowType } from '../domain/market/window';
import { mulberry32, randomSeed } from '../domain/market/rng';
import { monthAt } from '../domain/market/series';
import { matchEvents, type HistoricalEvent } from '../domain/events/history';
import { scoreRun, type RunScore } from '../domain/scoring/scoring';
import { buildMoshimo, type Moshimo } from '../domain/scoring/moshimo';
import type { RunLogEntry } from '../domain/scoring/parentReport';
import { getCashRates, getMarket } from './marketData';
import { useMeta } from './meta';
import { useSettings } from './settings';
import { sfxGrow, sfxShrink, sfxPanic, sfxFanfare } from '../platform/sound';

export type Screen =
  | 'home'
  | 'travel'
  | 'play'
  | 'return'
  | 'zukan'
  | 'parent'
  | 'settings';

export const INITIAL_CASH = 10000;
export const MONTHLY_ALLOWANCE = 1000;

interface GameState {
  screen: Screen;
  rs: RunState | null;
  windowType: WindowType | null;
  /** 帰還処理の計算結果（Return画面表示用） */
  result: {
    score: RunScore;
    moshimo: Moshimo;
    events: HistoricalEvent[];
    startMonth: string;
    recorded: boolean;
  } | null;

  go: (screen: Screen) => void;
  startRun: (lengthMonths: number, replaySeed?: number) => void;
  advanceMonth: () => void;
  buyAsset: (asset: AssetId, amount: number) => void;
  sellAsset: (asset: AssetId, amount: number) => void;
  toggleTsumitate: () => void;
  choosePanic: (choice: PanicChoice) => void;
  finishReturn: () => void;
  abandonRun: () => void;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      screen: 'home',
      rs: null,
      windowType: null,
      result: null,

      go: (screen) => set({ screen }),

      startRun: (lengthMonths, replaySeed) => {
        const market = getMarket();
        const seed = replaySeed ?? randomSeed();
        const rng = mulberry32(seed);
        const w = drawWindow(rng, market, lengthMonths, {
          recentStarts: replaySeed !== undefined ? [] : useMeta.getState().recentStarts,
        });
        const cfg: RunConfig = {
          startIndex: w.start,
          lengthMonths,
          initialCash: INITIAL_CASH,
          monthlyAllowance: MONTHLY_ALLOWANCE,
          seed,
        };
        set({ rs: createRun(cfg), windowType: w.type, result: null, screen: 'play' });
      },

      advanceMonth: () => {
        const { rs } = get();
        if (!rs || rs.pendingPanic || rs.finished) return;
        const market = getMarket();
        const next = advance(rs, market, getCashRates());
        const prevValue = rs.valueHistory[rs.turn];
        const newValue = next.valueHistory[next.turn];
        if (newValue >= prevValue) sfxGrow();
        else sfxShrink();
        if (next.pendingPanic) sfxPanic();
        set({ rs: next });
        if (next.finished) finalizeRun(set, next);
      },

      buyAsset: (asset, amount) => {
        const { rs } = get();
        if (!rs) return;
        set({ rs: doBuy(rs, asset, amount) });
      },

      sellAsset: (asset, amount) => {
        const { rs } = get();
        if (!rs) return;
        set({ rs: doSell(rs, asset, amount) });
      },

      toggleTsumitate: () => {
        const { rs } = get();
        if (!rs) return;
        set({ rs: setTsumitate(rs, !rs.tsumitate) });
      },

      choosePanic: (choice) => {
        const { rs } = get();
        if (!rs?.pendingPanic) return;
        set({ rs: resolvePanic(rs, choice) });
      },

      finishReturn: () => {
        set({ rs: null, windowType: null, result: null, screen: 'home' });
      },

      abandonRun: () => set({ rs: null, windowType: null, result: null, screen: 'home' }),
    }),
    {
      name: 'kq-run',
      version: 1,
      // 中断セーブ: 進行中の旅だけ永続化する（result等は帰還時に再計算可能だが保持する）
      partialize: (s) => ({ rs: s.rs, windowType: s.windowType, screen: s.screen === 'play' ? 'play' : 'home', result: null }) as Partial<GameState>,
    },
  ),
);

/** 帰還処理: スコア計算・もしも計算・イベント照合・メタ進行への記録 */
function finalizeRun(
  set: (partial: Partial<GameState>) => void,
  rs: RunState,
): void {
  const market = getMarket();
  const rates = getCashRates();
  const startMonth = monthAt(market, rs.cfg.startIndex);
  const score = scoreRun(rs, market, rates);
  const moshimo = buildMoshimo(rs, market, rates);
  const includeSensitive = useSettings.getState().sensitiveOn;
  const events = matchEvents(startMonth, rs.cfg.lengthMonths, { includeSensitive });

  const log: RunLogEntry = {
    at: new Date().toISOString(),
    lengthMonths: rs.cfg.lengthMonths,
    startMonth,
    eventIds: events.map((e) => e.id),
    panics: rs.panics,
    avgCashRatio: avg(rs.cashRatioHistory),
    avgEggScore: avg(rs.eggHistory),
    finalValue: score.finalValue,
    invested: rs.invested,
    stars: score.stars,
    medals: score.medals,
    acorns: score.acorns,
    tsumitateUsed: rs.actions.some((a) => a.type === 'tsumitate' && a.on),
  };
  useMeta.getState().addRunResult(log, score.acorns, score.medals, rs.cfg.startIndex);
  sfxFanfare();
  set({ result: { score, moshimo, events, startMonth, recorded: true }, screen: 'return' });
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
}

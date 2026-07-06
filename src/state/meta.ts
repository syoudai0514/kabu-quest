/**
 * メタ進行（どんぐりの森・図鑑・実績・親レポート用ログ）
 * localStorage永続化。個人情報は一切保存しない（名前入力すら無い）。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MedalId } from '../domain/scoring/scoring';
import type { RunLogEntry } from '../domain/scoring/parentReport';

export const TREE_COST = 25;
/** ながいたび解放条件 */
export const LONG_TRIP_RUNS = 3;

interface MetaState {
  acorns: number;
  trees: number;
  /** メダルごとの獲得回数 */
  medals: Partial<Record<MedalId, number>>;
  /** タネあかし済み歴史イベント（じだいずかん） */
  zukanEvents: string[];
  runLogs: RunLogEntry[];
  runsCompleted: number;
  /** 直近の旅の窓開始index（同じ時代の連続再訪を防ぐ。GDD §6.1） */
  recentStarts: number[];
  /** じだいずかんコンプ時のエンディング（とうしかのあかし）表示済みか */
  endingSeen: boolean;

  addRunResult: (log: RunLogEntry, acorns: number, medals: MedalId[], windowStart: number) => void;
  plantTree: () => boolean;
  markEndingSeen: () => void;
}

export const useMeta = create<MetaState>()(
  persist(
    (set, get) => ({
      acorns: 0,
      trees: 0,
      medals: {},
      zukanEvents: [],
      runLogs: [],
      runsCompleted: 0,
      recentStarts: [],
      endingSeen: false,

      addRunResult: (log, acorns, medals, windowStart) =>
        set((s) => {
          const medalCounts = { ...s.medals };
          for (const m of medals) medalCounts[m] = (medalCounts[m] ?? 0) + 1;
          return {
            acorns: s.acorns + acorns,
            medals: medalCounts,
            zukanEvents: [...new Set([...s.zukanEvents, ...log.eventIds])],
            runLogs: [...s.runLogs.slice(-49), log], // 直近50件
            runsCompleted: s.runsCompleted + 1,
            recentStarts: [...s.recentStarts.slice(-4), windowStart],
          };
        }),

      plantTree: () => {
        if (get().acorns < TREE_COST) return false;
        set((s) => ({ acorns: s.acorns - TREE_COST, trees: s.trees + 1 }));
        return true;
      },

      markEndingSeen: () => set({ endingSeen: true }),
    }),
    { name: 'kq-meta', version: 1 },
  ),
);

export function longTripUnlocked(runsCompleted: number): boolean {
  return runsCompleted >= LONG_TRIP_RUNS;
}

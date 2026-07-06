/**
 * 現金（ちょきんばこ）金利プロバイダ
 *
 * v1は0%固定（GDD §12-6の簡略化）。
 * 時代連動金利・未来シナリオ金利への拡張手順は docs/HANDOFF.md §1 を参照。
 * エンジン(engine/run.ts)は必ずCashRateProvider経由で金利を引くため、
 * ここに新しいプロバイダを足すだけで差し替えられる。
 */
import type { CashRateProvider, MonthId } from '../types';

export const zeroRate: CashRateProvider = {
  monthlyRate: () => 0,
};

/** 年利r%固定（複利換算で月次化） */
export function fixedAnnualRate(annual: number): CashRateProvider {
  const monthly = Math.pow(1 + annual, 1 / 12) - 1;
  return { monthlyRate: () => monthly };
}

/**
 * 時代連動金利のための実装口。
 * table: 適用開始月→年利 のソート済み配列。該当月以前で最も新しい行を使う。
 * 実データ（日本の定期預金金利等）の投入は docs/HANDOFF.md §1 の手順で行う。
 */
export function eraLinkedRate(table: Array<{ from: MonthId; annual: number }>): CashRateProvider {
  const sorted = [...table].sort((a, b) => a.from.localeCompare(b.from));
  return {
    monthlyRate(month: MonthId): number {
      let annual = 0;
      for (const row of sorted) {
        if (row.from <= month) annual = row.annual;
        else break;
      }
      return Math.pow(1 + annual, 1 / 12) - 1;
    },
  };
}

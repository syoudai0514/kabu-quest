/**
 * もしもタイムライン（反実仮想の資産曲線）
 *
 * 帰還画面でプレイヤーの実績曲線に重ねる「もうひとつの時間線」を計算する。
 * どの「もしも」を見せるかは旅の中身で決まる（GDD §6.4）:
 *   - パニックで売った        → 「もしも がまんして いたら」
 *   - パニックで耐えた/買った → 「もしも あのとき ぜんぶ うっていたら」
 *   - パニックなし・投資した  → 「もしも ちょきんばこ だけだったら」
 *   - ほぼ現金のまま          → 「もしも かぶを かっていたら」
 */
import type { AssetId, CashRateProvider, Market, RunAction } from '../types';
import { simulateScript, type RunState } from '../engine/run';

export type MoshimoKind = 'ifHeld' | 'ifSold' | 'ifCashOnly' | 'ifInvested';

export interface Moshimo {
  kind: MoshimoKind;
  /** こどもモードの見出し */
  kidLabel: string;
  values: number[];
}

const KID_LABELS: Record<MoshimoKind, string> = {
  ifHeld: 'もしも がまんして いたら…',
  ifSold: 'もしも あのとき ぜんぶ うっていたら…',
  ifCashOnly: 'もしも ちょきんばこ だけだったら…',
  ifInvested: 'もしも かぶを かっていたら…',
};

function panicAssetMap(state: RunState): Map<number, AssetId> {
  return new Map(state.panics.map((p) => [p.turn, p.asset]));
}

export function buildMoshimo(state: RunState, market: Market, rates: CashRateProvider): Moshimo {
  const kind = chooseKind(state);
  const values = simulateScript(market, state.cfg, scriptFor(kind, state), panicAssetMap(state), rates);
  return { kind, kidLabel: KID_LABELS[kind], values };
}

function chooseKind(state: RunState): MoshimoKind {
  const answered = state.panics.filter((p) => p.choice !== null);
  if (answered.some((p) => p.choice === 'sell')) return 'ifHeld';
  if (answered.length > 0) return 'ifSold';
  // 旅を通じてリスク資産をほぼ持たなかったか
  const avgCashRatio =
    state.cashRatioHistory.reduce((a, b) => a + b, 0) / state.cashRatioHistory.length;
  return avgCashRatio > 0.85 ? 'ifInvested' : 'ifCashOnly';
}

function scriptFor(kind: MoshimoKind, state: RunState): RunAction[] {
  switch (kind) {
    case 'ifHeld':
      // パニック時の「うる」を「がまん」に置き換える
      return state.actions.map((a) =>
        a.type === 'panicChoice' && a.choice === 'sell' ? { ...a, choice: 'hold' as const } : a,
      );
    case 'ifSold': {
      // 最初のパニックで全部売って、以後なにもしない
      const panicTurn = firstPanicTurn(state);
      const script = state.actions
        .filter((a) => a.turn <= panicTurn)
        .map((a) => (a.type === 'panicChoice' ? { ...a, choice: 'sell' as const } : a))
        // 売却後の追加購入は起きなかったことにする
        .filter((a) => a.type !== 'buy' || a.turn < panicTurn);
      // パニック売りした世界では、つみたても止めたはず
      script.push({ type: 'tsumitate', turn: panicTurn, on: false });
      return script;
    }
    case 'ifCashOnly':
      return [];
    case 'ifInvested': {
      // 出発時に初期資金を半々で投資し、つみたてON
      const half = state.cfg.initialCash / 2;
      return [
        { type: 'buy', turn: 0, asset: 'sp500', amount: half },
        { type: 'buy', turn: 0, asset: 'nikkei225', amount: half },
        { type: 'tsumitate', turn: 0, on: true },
      ];
    }
  }
}

function firstPanicTurn(state: RunState): number {
  return state.panics.length > 0 ? state.panics[0].turn : Number.MAX_SAFE_INTEGER;
}

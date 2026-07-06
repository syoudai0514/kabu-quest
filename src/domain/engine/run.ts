/**
 * 旅のエンジン（純粋リデューサ）
 *
 * ライブプレイ（UIから1操作ずつ）と、もしもタイムラインの一括リプレイ
 * （simulateScript）が同じ関数を通る。これにより「もしも」の計算が
 * 本編とズレる事故を構造的に防ぐ。
 *
 * ターンの時間モデル:
 *   turn = t のとき、プレイヤーは市場インデックス (startIndex + t) の価格で取引できる。
 *   advance() で t→t+1 の月次リターンが保有に適用され、新しい月のおこづかいが入る。
 */
import type {
  AssetId,
  CashRateProvider,
  Holdings,
  Market,
  PanicChoice,
  PanicRecord,
  RunAction,
  RunConfig,
} from '../types';
import { ASSET_IDS } from '../types';
import { monthAt, monthlyReturn } from '../market/series';
import { PANIC_DRAWDOWN, PANIC_MONTHLY_DROP } from '../market/window';
import * as pf from '../portfolio/portfolio';

export interface RunState {
  cfg: RunConfig;
  turn: number;
  holdings: Holdings;
  /** 累計入金額（初期資金＋おこづかい）。損益・ふっかつ賞判定の分母 */
  invested: number;
  /** 各ターン終了時点の総資産。valueHistory[t] = turn tでの評価額 */
  valueHistory: number[];
  /** 各ターンのたまごわけスコア（親レポート用） */
  eggHistory: number[];
  /** 各ターンの現金比率（親レポート用） */
  cashRatioHistory: number[];
  actions: RunAction[];
  panics: PanicRecord[];
  tsumitate: boolean;
  /** 選択待ちのパニックンバトル。null以外の間はadvance不可 */
  pendingPanic: PanicRecord | null;
  finished: boolean;
}

/** パニックン発動間隔の下限（連月暴落で毎月バトルにならないように） */
const PANIC_COOLDOWN_MONTHS = 3;
/** 発動回数上限（旅の長さで変える） */
export function maxPanicsFor(lengthMonths: number): number {
  return lengthMonths <= 24 ? 3 : 8;
}
/** これ未満の保有はパニック判定の対象にしない（誤差保有の除外） */
const HOLDING_EPSILON = 500;

export function createRun(cfg: RunConfig): RunState {
  const holdings: Holdings = { sp500: 0, nikkei225: 0, cash: cfg.initialCash };
  return {
    cfg,
    turn: 0,
    holdings,
    invested: cfg.initialCash,
    valueHistory: [cfg.initialCash],
    eggHistory: [pf.eggScore(holdings)],
    cashRatioHistory: [1],
    actions: [],
    panics: [],
    tsumitate: false,
    pendingPanic: null,
    finished: false,
  };
}

export function doBuy(state: RunState, asset: AssetId, amount: number): RunState {
  if (state.finished) return state;
  const { next, bought } = pf.buy(state.holdings, asset, amount);
  if (bought <= 0) return state;
  return {
    ...state,
    holdings: next,
    actions: [...state.actions, { type: 'buy', turn: state.turn, asset, amount: bought }],
  };
}

export function doSell(state: RunState, asset: AssetId, amount: number): RunState {
  if (state.finished) return state;
  const { next, sold } = pf.sell(state.holdings, asset, amount);
  if (sold <= 0) return state;
  return {
    ...state,
    holdings: next,
    actions: [...state.actions, { type: 'sell', turn: state.turn, asset, amount: sold }],
  };
}

export function setTsumitate(state: RunState, on: boolean): RunState {
  if (state.finished || state.tsumitate === on) return state;
  return {
    ...state,
    tsumitate: on,
    actions: [...state.actions, { type: 'tsumitate', turn: state.turn, on }],
  };
}

/**
 * 1ヶ月進める。
 * 順序: リターン適用 → おこづかい → つみたて自動買付 → 記録 → パニック判定
 */
export function advance(state: RunState, market: Market, rates: CashRateProvider): RunState {
  if (state.finished || state.pendingPanic) return state;
  const t = state.turn + 1;
  const idx = state.cfg.startIndex + t;
  const month = monthAt(market, idx);

  const returns = {} as Record<AssetId, number>;
  for (const a of ASSET_IDS) returns[a] = monthlyReturn(market, a, idx);

  let holdings = pf.applyReturns(state.holdings, returns, rates.monthlyRate(month));
  let invested = state.invested;

  // おこづかい（最終ターンは旅が終わるので入金しない）
  const isLast = t >= state.cfg.lengthMonths;
  if (!isLast) {
    holdings = { ...holdings, cash: holdings.cash + state.cfg.monthlyAllowance };
    invested += state.cfg.monthlyAllowance;
    if (state.tsumitate) {
      // つみたて: おこづかいを両資産に半分ずつ自動買付（こつこつさくせん）
      const half = state.cfg.monthlyAllowance / 2;
      holdings = pf.buy(holdings, 'sp500', half).next;
      holdings = pf.buy(holdings, 'nikkei225', half).next;
    }
  }

  const value = pf.totalValue(holdings);
  const next: RunState = {
    ...state,
    turn: t,
    holdings,
    invested,
    valueHistory: [...state.valueHistory, value],
    eggHistory: [...state.eggHistory, pf.eggScore(holdings)],
    cashRatioHistory: [...state.cashRatioHistory, holdings.cash / Math.max(value, 1)],
    finished: isLast,
  };

  if (!isLast) {
    const panic = detectPanic(next, market, returns);
    if (panic) return { ...next, pendingPanic: panic, panics: [...next.panics, panic] };
  }
  return next;
}

function detectPanic(
  state: RunState,
  market: Market,
  returns: Record<AssetId, number>,
): PanicRecord | null {
  if (state.panics.length >= maxPanicsFor(state.cfg.lengthMonths)) return null;
  const last = state.panics[state.panics.length - 1];
  if (last && state.turn - last.turn < PANIC_COOLDOWN_MONTHS) return null;

  const held = ASSET_IDS.filter((a) => state.holdings[a] >= HOLDING_EPSILON);
  if (held.length === 0) return null;

  // 条件1: 保有資産の単月−8%超下落
  let worst: AssetId | null = null;
  for (const a of held) {
    if (returns[a] <= PANIC_MONTHLY_DROP && (worst === null || returns[a] < returns[worst])) {
      worst = a;
    }
  }
  if (worst) {
    return { turn: state.turn, asset: worst, trigger: 'monthlyDrop', severity: returns[worst], choice: null };
  }

  // 条件2: 旅開始からのポートフォリオ・ドローダウン−20%超
  const peak = Math.max(...state.valueHistory);
  const dd = state.valueHistory[state.turn] / peak - 1;
  if (dd <= PANIC_DRAWDOWN) {
    const worstHeld = held.reduce((a, b) => (returns[a] < returns[b] ? a : b));
    return { turn: state.turn, asset: worstHeld, trigger: 'drawdown', severity: dd, choice: null };
  }
  return null;
}

/**
 * パニックンバトルの選択を適用する。
 * うる   = リスク資産を全売却
 * がまん = 何もしない
 * かいます = 手元の現金を全額、引き金になった資産へ
 */
export function resolvePanic(state: RunState, choice: PanicChoice): RunState {
  const panic = state.pendingPanic;
  if (!panic) return state;
  let holdings = state.holdings;
  if (choice === 'sell') {
    for (const a of ASSET_IDS) holdings = pf.sell(holdings, a, holdings[a]).next;
  } else if (choice === 'buy') {
    holdings = pf.buy(holdings, panic.asset, holdings.cash).next;
  }
  const panics = state.panics.map((p) => (p.turn === panic.turn ? { ...p, choice } : p));
  return {
    ...state,
    holdings,
    panics,
    pendingPanic: null,
    actions: [...state.actions, { type: 'panicChoice', turn: state.turn, choice }],
  };
}

// ---------------------------------------------------------------------------
// スクリプトリプレイ（もしもタイムライン・ベンチマーク計算用）
// ---------------------------------------------------------------------------

/**
 * 行動ログを「取引の台本」として最初から再生し、資産推移を返す。
 * panicChoiceは検知に関係なく台本どおりの取引として適用する
 * （もしも世界では発動条件がズレるが、比較したいのは取引の帰結であるため）。
 * panicAssets: turn→引き金資産。'かいます'の再現に必要。
 */
export function simulateScript(
  market: Market,
  cfg: RunConfig,
  script: RunAction[],
  panicAssets: Map<number, AssetId>,
  rates: CashRateProvider,
): number[] {
  let state = createRun(cfg);
  const byTurn = new Map<number, RunAction[]>();
  for (const a of script) {
    const list = byTurn.get(a.turn) ?? [];
    list.push(a);
    byTurn.set(a.turn, list);
  }

  while (!state.finished) {
    for (const action of byTurn.get(state.turn) ?? []) {
      switch (action.type) {
        case 'buy':
          state = doBuy(state, action.asset, action.amount);
          break;
        case 'sell':
          state = doSell(state, action.asset, action.amount);
          break;
        case 'tsumitate':
          state = setTsumitate(state, action.on);
          break;
        case 'panicChoice': {
          // リプレイでは検知を経ずに取引だけ適用する
          const asset = panicAssets.get(action.turn) ?? 'sp500';
          state = { ...state, pendingPanic: { turn: action.turn, asset, trigger: 'monthlyDrop', severity: 0, choice: null } };
          state = resolvePanic(state, action.choice);
          break;
        }
      }
    }
    // リプレイ中に本物の検知でpendingPanicが立ったら、台本にない出来事なので黙殺して進む
    state = { ...state, pendingPanic: null };
    state = advance(state, market, rates);
  }
  return state.valueHistory;
}

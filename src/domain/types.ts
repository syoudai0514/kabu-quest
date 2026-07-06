/**
 * domain層 共通型定義
 *
 * domain/ 以下はReact・Zustand・DOMに一切依存しない純粋ロジック。
 * すべてVitestの対象であり、UIからは関数呼び出しのみで利用する。
 */

/** 投資可能なリスク資産のID。銘柄追加はこのunionと data/assets.ts への登録で完結する */
export type AssetId = 'sp500' | 'nikkei225';

export const ASSET_IDS: AssetId[] = ['sp500', 'nikkei225'];

/** 保有資産。値はすべて円建て評価額（口数・取得単価は持たない。GDD §12-8） */
export interface Holdings {
  sp500: number;
  nikkei225: number;
  cash: number;
}

/** "YYYY-MM" 形式の月ID */
export type MonthId = string;

/** 同梱JSONの形（scripts/build-market-data.mjs の出力） */
export interface SeriesJson {
  id: AssetId;
  startMonth: MonthId;
  prices: number[];
  methodology: string;
  source: { name: string; url: string; retrievedAt: string; note?: string; license?: string };
}

/** 全資産を同一期間にアラインした市場データ */
export interface Market {
  startMonth: MonthId;
  /** アライン後の月数。prices[asset].length と一致 */
  months: number;
  prices: Record<AssetId, number[]>;
}

/** 旅（1プレイ）の設定 */
export interface RunConfig {
  /** アライン済みMarketに対する開始インデックス */
  startIndex: number;
  /** 旅の長さ（月数）。つうじょう24 / ながいたび120 */
  lengthMonths: number;
  /** 初期資金（円） */
  initialCash: number;
  /** 毎月のおこづかい（円） */
  monthlyAllowance: number;
  /** 抽選に使ったシード（リプレイ・「もういちど おなじ じだいへ」用） */
  seed: number;
}

/** プレイヤーの行動ログ。もしもタイムライン再計算の唯一の情報源 */
export type RunAction =
  | { type: 'buy'; turn: number; asset: AssetId; amount: number }
  | { type: 'sell'; turn: number; asset: AssetId; amount: number }
  | { type: 'tsumitate'; turn: number; on: boolean }
  | { type: 'panicChoice'; turn: number; choice: PanicChoice };

export type PanicChoice = 'sell' | 'hold' | 'buy';

export interface PanicRecord {
  turn: number;
  /** 引き金になった資産（ポートフォリオDDの場合は下落率最大の保有資産） */
  asset: AssetId;
  /** 引き金: 単月下落か、旅開始からのドローダウンか */
  trigger: 'monthlyDrop' | 'drawdown';
  /** 引き金時点の下落率（負値） */
  severity: number;
  choice: PanicChoice | null;
}

/** 現金金利の抽象化。
 * v1は常に0%だが、時代連動金利・未来の想定金利への差し替え口として
 * エンジンはこのインターフェース経由でのみ金利を参照する（docs/HANDOFF.md §1） */
export interface CashRateProvider {
  /** 指定月の月次金利（例: 年6%なら約0.00487） */
  monthlyRate(month: MonthId): number;
}

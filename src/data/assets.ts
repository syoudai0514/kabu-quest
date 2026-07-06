/**
 * 資産の表示メタデータ。
 * 銘柄追加は ①types.tsのAssetId ②generated/へのJSON追加 ③ここへの登録 で完結する。
 */
import type { AssetId } from '../domain/types';

export interface AssetMeta {
  id: AssetId;
  kidName: string;
  adultName: string;
  emoji: string;
  /** カードの基調色（Tailwindクラスではなく生の色。チャート線と共用） */
  color: string;
  kidDescription: string;
}

export const ASSETS: AssetMeta[] = [
  {
    id: 'sp500',
    kidName: 'アメリカの かぶセット',
    adultName: 'S&P500（円換算なし・配当なし）',
    emoji: '🦅',
    color: '#3b82f6',
    kidDescription: 'アメリカの おおきな かいしゃ 500こ の つめあわせ',
  },
  {
    id: 'nikkei225',
    kidName: 'にっぽんの かぶセット',
    adultName: '日経平均株価（配当なし）',
    emoji: '🗻',
    color: '#ef4444',
    kidDescription: 'にっぽんの ゆうめいな かいしゃ 225こ の つめあわせ',
  },
];

export const CASH_META = {
  kidName: 'ちょきんばこ',
  adultName: '現金（金利0%）',
  emoji: '🐷',
  color: '#f59e0b',
  kidDescription: 'へらない。でも ふえない。',
};

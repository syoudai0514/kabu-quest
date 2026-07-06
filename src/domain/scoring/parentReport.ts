/**
 * 親ダッシュボード用の集計と「今夜の会話カード」生成
 *
 * 分析よりも会話のきっかけ供給が主目的（GDD §11）。
 * 指標に優劣の色付けをしない——「慎重派↔冒険派」は性格であって成績ではない。
 */
import type { MedalId } from './scoring';
import type { PanicRecord } from '../types';
import { HISTORICAL_EVENTS } from '../events/history';

/** 1回の旅の記録（metaストアに永続化される形） */
export interface RunLogEntry {
  at: string; // ISO日時
  lengthMonths: number;
  /** 実際の開始年月（帰還後は開示済みなので保存してよい） */
  startMonth: string;
  eventIds: string[];
  panics: PanicRecord[];
  avgCashRatio: number;
  avgEggScore: number;
  finalValue: number;
  invested: number;
  stars: number;
  medals: MedalId[];
  acorns: number;
  tsumitateUsed: boolean;
}

export interface ParentReport {
  runCount: number;
  /** パニックンとの対戦成績 */
  panicRecord: { wins: number; losses: number };
  /** 0=ちょきん中心 〜 1=ぜんぶ投資。優劣ではなくスタイル */
  riskStyle: number;
  /** たまごわけスコア平均（0〜1） */
  eggAvg: number;
  /** 体験済み歴史イベント */
  experiencedEvents: string[];
  /** 今夜の会話カード */
  card: string | null;
}

export function buildParentReport(entries: RunLogEntry[]): ParentReport {
  if (entries.length === 0) {
    return {
      runCount: 0,
      panicRecord: { wins: 0, losses: 0 },
      riskStyle: 0.5,
      eggAvg: 0,
      experiencedEvents: [],
      card: null,
    };
  }
  const allPanics = entries.flatMap((e) => e.panics).filter((p) => p.choice !== null);
  const wins = allPanics.filter((p) => p.choice === 'hold' || p.choice === 'buy').length;
  const losses = allPanics.filter((p) => p.choice === 'sell').length;
  const riskStyle = 1 - avg(entries.map((e) => e.avgCashRatio));
  const eggAvg = avg(entries.map((e) => e.avgEggScore));
  const experiencedEvents = [...new Set(entries.flatMap((e) => e.eventIds))];
  return {
    runCount: entries.length,
    panicRecord: { wins, losses },
    riskStyle,
    eggAvg,
    experiencedEvents,
    card: conversationCard(entries[entries.length - 1]),
  };
}

/**
 * 直近の旅の中身に応じた質問文を返す。
 * 「正解を教える」文言は禁止。子の判断の理由を聞く質問のみ。
 */
export function conversationCard(entry: RunLogEntry): string {
  const eventName = entry.eventIds
    .map((id) => HISTORICAL_EVENTS.find((e) => e.id === id)?.adultTitle)
    .filter(Boolean)[0];

  const panic = entry.panics.filter((p) => p.choice !== null);
  const held = panic.filter((p) => p.choice === 'hold' || p.choice === 'buy');
  const sold = panic.filter((p) => p.choice === 'sell');

  if (held.length > 0 && eventName) {
    return `今日は「${eventName}」の時代を旅して、暴落の場面でパニックンの誘惑に勝ちました。「どうして がまんできたの？」と、理由を聞いてみてください。`;
  }
  if (sold.length > 0 && eventName) {
    return `今日は「${eventName}」の時代で、こわくなって株を売る体験をしました。責めずに「うったとき、どんな きもちだった？」と聞いてみてください。売りたくなる気持ちは大人も同じ、と伝えるチャンスです。`;
  }
  if (entry.finalValue < entry.invested * 0.8) {
    return `今日の旅は大きくへって帰ってきましたが、最後まで旅を続けました。「つぎは どうしてみたい？」と、次の作戦を一緒に考えてみてください。`;
  }
  if (entry.tsumitateUsed) {
    return `今日は「まいつき こつこつ さくせん」（つみたて）を使いました。「まいつき すこしずつ かうと、なにが いいんだろうね？」と聞いてみてください。`;
  }
  if (entry.avgEggScore >= 0.5) {
    return `今日は おかねを上手に分けて持つ「たまごわけ」ができていました。「どうして ぜんぶ おなじものに しなかったの？」と聞いてみてください。`;
  }
  if (eventName) {
    return `今日は「${eventName}」の時代を旅しました。「その じだいで いちばん びっくりしたことは？」と聞いてみてください。`;
  }
  return `今日はおだやかな時代を旅しました。「まって いるあいだ、どんな きもちだった？」——何もしないで待つ体験について聞いてみてください。`;
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

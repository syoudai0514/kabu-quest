/**
 * 二層テキスト辞書（こども/おとな）
 *
 * モード切替は「翻訳の切替」であって難易度の切替ではない（GDD §3）。
 * 将来の多言語化もこの辞書機構をそのまま拡張する（docs/HANDOFF.md §4）。
 */

export interface TermEntry {
  kid: string;
  adult: string;
}

export const TERMS = {
  buy: { kid: 'かう', adult: '買う' },
  sell: { kid: 'うる', adult: '売る' },
  hold: { kid: 'がまんする', adult: '保有継続' },
  panicBuy: { kid: 'かいます！', adult: '買い増す' },
  nextMonth: { kid: 'つぎのつきへ', adult: '翌月へ' },
  totalAsset: { kid: 'ぜんぶで', adult: '総資産' },
  diversify: { kid: 'たまごわけ', adult: '分散投資' },
  tsumitate: { kid: 'まいつき こつこつ さくせん', adult: 'つみたて（ドルコスト平均法）' },
  crash: { kid: 'がけくだり', adult: '暴落' },
  risk: { kid: 'ゆれ', adult: 'リスク（変動）' },
  longTrip: { kid: 'ながい たび（10ねん）', adult: 'ロングラン（120ヶ月）' },
  normalTrip: { kid: 'たびに でる（2ねん）', adult: '通常ラン（24ヶ月）' },
  allowance: { kid: 'おこづかい', adult: '毎月の入金' },
  return_: { kid: 'そだった ぶん', adult: 'リターン' },
  principal: { kid: 'さいしょの おかね', adult: '元本' },
} satisfies Record<string, TermEntry>;

export type TermKey = keyof typeof TERMS;

export function term(key: TermKey, adultMode: boolean): string {
  return adultMode ? TERMS[key].adult : TERMS[key].kid;
}

/** ことばずかん用: 全用語の対訳リスト */
export const WORD_BOOK: Array<{ kid: string; adult: string; kidNote: string }> = [
  { kid: 'かぶ', adult: '株式', kidNote: 'かいしゃの かけら。もっていると かいしゃの なかまに なれる。' },
  { kid: 'かぶセット', adult: '指数（インデックス）', kidNote: 'たくさんの かいしゃの かぶの つめあわせ。' },
  { kid: 'たまごわけ さくせん', adult: '分散投資', kidNote: 'たまごを ひとつの かごに いれない。ひとつ われても だいじょうぶ。' },
  { kid: 'ゆきだるまの まほう', adult: '複利', kidNote: 'そだった ぶんが、また そだつ。ころがるほど はやく おおきくなる。' },
  { kid: 'がけくだり', adult: '暴落', kidNote: 'かぶが きゅうに やすくなること。こわいけど、ずっとは つづかない。' },
  { kid: 'ながい たび', adult: '長期投資', kidNote: 'あわてず、じかんに そだててもらう さくせん。' },
  { kid: 'まいつき こつこつ さくせん', adult: 'ドルコスト平均法（つみたて）', kidNote: 'まいつき おなじだけ かう。たかいときは すこし、やすいときは たくさん かえる。' },
  { kid: 'パニックンに まけること', adult: '狼狽（ろうばい）売り', kidNote: 'こわくなって あわてて うっちゃうこと。' },
  { kid: 'ゆれ', adult: 'リスク', kidNote: 'おおきく そだつかもしれないし、へるかもしれない、ゆれの おおきさ。' },
  { kid: 'さいしょの おかね', adult: '元本', kidNote: 'じぶんが いれた おかねの こと。' },
  { kid: 'そだった ぶん', adult: 'リターン（利益）', kidNote: 'ゆきだるまが おおきくなった ぶん。' },
  { kid: 'インフレの かぜ', adult: 'インフレーション', kidNote: 'ものの ねだんが あがって、おなじ おかねで かえるものが へること。' },
];

/**
 * 金額表示。
 * こども: 「3まん4500えん」（100円未満は丸め）／ おとな: 「¥34,512」
 */
export function fmtYen(value: number, adultMode: boolean): string {
  const n = Math.round(value);
  if (adultMode) return `¥${n.toLocaleString('ja-JP')}`;
  const rounded = Math.round(n / 100) * 100;
  const man = Math.floor(rounded / 10000);
  const rest = rounded % 10000;
  if (man > 0 && rest > 0) return `${man}まん${rest}えん`;
  if (man > 0) return `${man}まんえん`;
  return `${rounded}えん`;
}

/** 「たびの nヶ月め」or 実年月 */
export function fmtTravelMonth(turn: number, realMonth: string, revealed: boolean): string {
  if (revealed) {
    const [y, m] = realMonth.split('-');
    return `${y}ねん ${Number(m)}がつ`;
  }
  return `たびの ${turn + 1}かげつめ`;
}

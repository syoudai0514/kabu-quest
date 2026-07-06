import type { MedalId } from '../domain/scoring/scoring';

export const MEDALS: Record<MedalId, { emoji: string; name: string; desc: string }> = {
  gaman: { emoji: '🛡️', name: 'がまんメダル', desc: 'がけくだりで パニックンに かたなかった…じゃなくて、かった！' },
  yuki: { emoji: '⚔️', name: 'ゆうきメダル', desc: 'みんなが こわがってるとき、ゆうきを だして かった！' },
  kotsukotsu: { emoji: '🐢', name: 'こつこつ賞', desc: 'まいつき こつこつ さくせんを つづけた！' },
  tamagoWake: { emoji: '🥚', name: 'たまごわけ名人', desc: 'おかねを じょうずに わけて もった！' },
  fukkatsu: { emoji: '🌅', name: 'ふっかつ賞', desc: 'おおきく へっても、あきらめずに もりかえした！' },
  kanso: { emoji: '🏅', name: 'かんそう賞', desc: 'おおきく へっても、さいごまで たびを つづけた。それが いちばん つよい！' },
};

/**
 * パニックンバトル（我慢メカニクス。GDD §6.3）
 *
 * 設計意図: 制限時間は設けない。焦らせるのはパニックンのセリフだけで、
 * UIは静かに待つ——現実の投資に締切はないという非対称を体験させる。
 * 選択の良し悪しはその場で評価せず、帰還時の「もしもタイムライン」で明かす。
 */
import { useState } from 'react';
import Button from './Button';
import CharacterBubble from './CharacterBubble';
import { useGame } from '../../state/game';
import { useMeta } from '../../state/meta';
import { useSettings } from '../../state/settings';
import { ASSETS } from '../../data/assets';
import { term } from '../i18n/text';
import type { PanicChoice, PanicRecord } from '../../domain/types';

const PANIC_LINES = [
  'うっちゃえ！ ぜんぶ うっちゃえ！ ゼロに なっちゃうぞ〜！',
  'みんな うってるぞ！ きみだけ とりのこされちゃうぞ〜！',
  'ほらほら！ ゆきだるまが とけちゃう〜！ いま うれば まにあうぞ！',
];

const AFTER_LINES: Record<PanicChoice, string> = {
  sell: 'へへっ、うっちゃったね…。どうなるかは、かえってからの おたのしみ。',
  hold: 'な、なんで へいきなの…！？ つまんないの〜！（すこし ちいさくなった）',
  buy: 'か、かうだって！？ こんなときに！？ し、しんじられない…！（かなり ちいさくなった）',
};

export default function PanicBattle({ panic }: { panic: PanicRecord }) {
  const choosePanic = useGame((s) => s.choosePanic);
  const cash = useGame((s) => s.rs?.holdings.cash ?? 0);
  const runLogs = useMeta((s) => s.runLogs);
  const { adultMode, shakeOn } = useSettings();
  const [chosen, setChosen] = useState<PanicChoice | null>(null);

  const asset = ASSETS.find((a) => a.id === panic.asset)!;
  const line = PANIC_LINES[Math.abs(panic.turn) % PANIC_LINES.length];
  const pct = Math.round(panic.severity * 100);

  // 我慢に勝つたびパニックンは小さく、負けると太る（GDD §4）
  const past = runLogs.flatMap((l) => l.panics).filter((p) => p.choice !== null);
  const wins = past.filter((p) => p.choice !== 'sell').length;
  const losses = past.length - wins;
  const panicScale = Math.min(Math.max(1 + (losses - wins) * 0.08, 0.55), 1.5);

  const choose = (c: PanicChoice) => {
    setChosen(c);
    window.setTimeout(() => choosePanic(c), 1600);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-purple-950/90 p-5 ${
        shakeOn && !chosen ? 'kq-shake' : ''
      }`}
    >
      <div className="w-full max-w-sm">
        {!chosen ? (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <div className="text-7xl kq-floaty" style={{ transform: `scale(${panicScale})` }}>
                👻
              </div>
              <p className="mt-1 text-sm font-bold tracking-widest text-purple-300">
                パニックン があらわれた！
                {panicScale < 0.8 && <span className="block text-xs text-purple-400">（まえより ちいさく なってる…！）</span>}
              </p>
            </div>
            <div className="rounded-2xl bg-purple-900/80 p-3 text-center">
              <p className="text-lg font-bold text-rose-300">
                {asset.emoji} {adultMode ? asset.adultName : asset.kidName} が {term('crash', adultMode)}！
              </p>
              {adultMode && (
                <p className="text-xs text-purple-200">
                  {panic.trigger === 'monthlyDrop' ? `単月 ${pct}%` : `高値から ${pct}%`} の下落
                </p>
              )}
            </div>
            <CharacterBubble who="panic">{line}</CharacterBubble>
            <CharacterBubble who="colin">
              おちついて…！ フクじいが「あらしは いつか やむ」って いってたよ…！
            </CharacterBubble>
            <div className="flex flex-col gap-2.5">
              <Button variant="danger" size="lg" onClick={() => choose('sell')}>
                😱 {term('sell', adultMode)}（ぜんぶ うる）
              </Button>
              <Button size="lg" onClick={() => choose('hold')}>
                😤 {term('hold', adultMode)}
              </Button>
              <Button variant="secondary" size="lg" disabled={cash < 500} onClick={() => choose('buy')}>
                😲 {term('panicBuy', adultMode)}（ちょきんばこ ぜんぶ）
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 kq-pop">
            <div className="text-center text-6xl">{chosen === 'sell' ? '👻' : '💨'}</div>
            <CharacterBubble who="panic">{AFTER_LINES[chosen]}</CharacterBubble>
          </div>
        )}
      </div>
    </div>
  );
}

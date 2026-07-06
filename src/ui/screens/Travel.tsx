/** タイムマシンのりば（出発演出） */
import { useState } from 'react';
import Button from '../components/Button';
import CharacterBubble from '../components/CharacterBubble';
import { useGame } from '../../state/game';
import { sfxTimeMachine } from '../../platform/sound';

export default function Travel() {
  const { go, startRun } = useGame();
  const [launching, setLaunching] = useState(false);

  const launch = () => {
    setLaunching(true);
    sfxTimeMachine();
    window.setTimeout(() => startRun(24), 1200);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 p-6">
      {!launching ? (
        <>
          <div className="w-full">
            <CharacterBubble who="fukujii">
              これから きみを、むかしの そうばの せかいへ おくる。<br />
              <b>いつの じだいかは、ついてからの おたのしみ</b> じゃ。
              かえってきたら、ぜんぶ おしえてやろう。ほっほ。
            </CharacterBubble>
          </div>
          <div className="text-7xl kq-floaty">🛸</div>
          <div className="rounded-2xl bg-white/10 px-4 py-2 font-mono text-2xl tracking-widest text-cyan-300">
            ????ねん ??がつ
          </div>
          <Button size="lg" onClick={launch}>
            🚀 タイムマシンに のりこむ！
          </Button>
          <Button variant="ghost" size="sm" onClick={() => go('home')}>
            もどる
          </Button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="text-8xl kq-timewarp">🛸</div>
          <p className="text-lg text-cyan-200 kq-fadein">じかんを こえています…</p>
        </div>
      )}
    </div>
  );
}

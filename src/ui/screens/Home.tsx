/** もりのひろば（ホーム/メタ画面） */
import Button from '../components/Button';
import CharacterBubble from '../components/CharacterBubble';
import { useGame } from '../../state/game';
import { useMeta, TREE_COST, LONG_TRIP_RUNS, longTripUnlocked } from '../../state/meta';
import { useSettings } from '../../state/settings';
import { term } from '../i18n/text';
import { sfxAcorn } from '../../platform/sound';

/** 木の配置を決める擬似乱数（index固定なので毎回同じ森になる） */
function treePos(i: number): { left: number; top: number; size: number } {
  const h = (i * 2654435761) % 1000;
  return {
    left: 6 + ((h * 7) % 88),
    top: 12 + ((h * 13) % 55),
    size: 22 + ((h * 3) % 18),
  };
}

export default function Home() {
  const { go, rs, startRun } = useGame();
  const { acorns, trees, runsCompleted, plantTree } = useMeta();
  const adultMode = useSettings((s) => s.adultMode);
  const longOk = longTripUnlocked(runsCompleted);
  const hasSave = rs !== null && !rs.finished;

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-800 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-wide text-amber-200">カブクエスト</h1>
        <div className="flex items-center gap-1 rounded-full bg-amber-900/60 px-3 py-1 text-amber-100">
          <span className="text-lg">🌰</span>
          <span className="font-bold">{acorns}</span>
        </div>
      </header>

      {/* どんぐりの森: 旅の成果が木として積み上がる（GDD §4） */}
      <div className="relative mt-3 h-44 overflow-hidden rounded-3xl bg-gradient-to-b from-sky-800 to-emerald-700">
        <div className="absolute right-3 top-2 text-2xl">🌙</div>
        {Array.from({ length: trees }, (_, i) => {
          const p = treePos(i);
          return (
            <span
              key={i}
              className="absolute"
              style={{ left: `${p.left}%`, top: `${p.top}%`, fontSize: p.size }}
            >
              🌲
            </span>
          );
        })}
        {trees === 0 && (
          <p className="absolute inset-x-0 top-1/3 text-center text-sm text-emerald-100/80">
            まだ きが ないよ。たびに でて どんぐりを あつめよう！
          </p>
        )}
        <div className="absolute bottom-1 left-2 text-3xl">🐿️</div>
      </div>

      <div className="mt-3">
        <CharacterBubble who="colin">
          {hasSave
            ? 'たびの とちゅうだよ！ つづきに いこう！'
            : runsCompleted === 0
              ? 'やあ！ ぼく コリン。フクじいの タイムマシンで むかしの せかいに いって、おかねの ゆきだるまを そだてよう！'
              : `おかえり！ どんぐり ${TREE_COST}こで きが うえられるよ。`}
        </CharacterBubble>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {hasSave && (
          <Button size="lg" variant="secondary" onClick={() => go('play')}>
            ▶ つづきから
          </Button>
        )}
        <Button size="lg" onClick={() => go('travel')}>
          🚀 {term('normalTrip', adultMode)}
        </Button>
        {longOk ? (
          <Button size="lg" variant="secondary" onClick={() => startRun(120)}>
            🌟 {term('longTrip', adultMode)}
          </Button>
        ) : (
          <div className="rounded-3xl bg-white/5 px-4 py-3 text-center text-sm text-slate-300">
            🔒 {term('longTrip', adultMode)}（あと {LONG_TRIP_RUNS - runsCompleted} かい たびに でると ひらくよ）
          </div>
        )}
        <Button
          variant="secondary"
          disabled={acorns < TREE_COST}
          onClick={() => {
            if (plantTree()) sfxAcorn();
          }}
        >
          🌱 きを うえる（🌰{TREE_COST}）
        </Button>
      </div>

      <nav className="mt-auto flex justify-around pt-4 text-sm">
        <Button variant="ghost" onClick={() => go('zukan')}>
          📖 ずかん
        </Button>
        <Button variant="ghost" onClick={() => go('settings')}>
          ⚙️ せってい
        </Button>
        <Button variant="ghost" onClick={() => go('parent')}>
          👪 おうちのひとへ
        </Button>
      </nav>
    </div>
  );
}

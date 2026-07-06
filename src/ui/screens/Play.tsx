/** メイン相場画面（1ターン＝1ヶ月）。「なにもしない」が最速の操作（GDD §5） */
import { useMemo, useState } from 'react';
import Button from '../components/Button';
import CharacterBubble from '../components/CharacterBubble';
import Snowball from '../components/Snowball';
import ValueChart from '../components/ValueChart';
import PanicBattle from '../components/PanicBattle';
import { useGame } from '../../state/game';
import { useMeta } from '../../state/meta';
import { useSettings } from '../../state/settings';
import { getMarket } from '../../state/marketData';
import { monthAt, monthlyReturn } from '../../domain/market/series';
import { decadeFlavor, hintForMonth } from '../../domain/events/history';
import { totalValue } from '../../domain/portfolio/portfolio';
import { ASSETS, CASH_META } from '../../data/assets';
import { fmtYen, term } from '../i18n/text';

const TUTORIAL: string[] = [
  'この ゆきだるまが、きみの おかね だよ！ かぶを かうと、ゆきだるまが ころがって そだつかも！',
  'したの「＋1000えん」で かぶが かえるよ。かわずに ようすを みても いいんだ。',
  '「つぎのつきへ」を おすと 1かげつ すすむよ。あわてなくて だいじょうぶ。じかんは みかた だからね！',
];

export default function Play() {
  const { rs, go, advanceMonth, buyAsset, sellAsset, toggleTsumitate } = useGame();
  const { adultMode, sensitiveOn, tutorialDone, set: setSettings } = useSettings();
  const runsCompleted = useMeta((s) => s.runsCompleted);
  const [tutStep, setTutStep] = useState(0);

  const market = useMemo(getMarket, []);
  if (!rs) {
    // 旅がない状態でこの画面に来たら安全にホームへ
    go('home');
    return null;
  }

  const idx = rs.cfg.startIndex + rs.turn;
  const realMonth = monthAt(market, idx);
  const value = totalValue(rs.holdings);
  const lastChange = rs.turn > 0 ? rs.valueHistory[rs.turn] - rs.valueHistory[rs.turn - 1] : 0;
  const remaining = rs.cfg.lengthMonths - rs.turn;

  // ニュースカード: イベント固有ヒント優先、なければ低頻度で年代フレーバー
  const news =
    rs.turn > 0
      ? (hintForMonth(realMonth, { includeSensitive: sensitiveOn }) ??
        (rs.turn % 6 === 3 ? decadeFlavor(realMonth, rs.cfg.seed + rs.turn) : null))
      : null;

  const showTutorial = !tutorialDone && runsCompleted === 0 && tutStep < TUTORIAL.length;

  return (
    <div className="flex min-h-dvh flex-col bg-slate-900">
      {/* ヘッダ: 時代は隠す（タネあかしは帰還時。GDD §6.1） */}
      <header className="flex items-center justify-between px-4 pt-3 text-sm text-slate-300">
        <button className="text-lg" onClick={() => go('home')} aria-label="もりへもどる">
          🏠
        </button>
        <div className="font-bold text-cyan-200">
          {adultMode ? `??年??月（${rs.turn + 1}/${rs.cfg.lengthMonths + 1}ヶ月）` : `たびの ${rs.turn + 1}かげつめ`}
        </div>
        <div className="text-slate-400">あと{remaining}</div>
      </header>

      {/* 雪だるま（感情の主役） */}
      <div className="h-40 px-3 pt-2">
        <div className="h-full overflow-hidden rounded-3xl">
          <Snowball value={value} progress={rs.turn / rs.cfg.lengthMonths} lastChange={lastChange} />
        </div>
      </div>

      {/* 総資産＋チャート */}
      <div className="px-4 pt-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-400">{term('totalAsset', adultMode)}</span>
          <span className={`text-2xl font-bold ${lastChange >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {fmtYen(value, adultMode)}
            {rs.turn > 0 && (
              <span className="ml-1 text-sm">{lastChange >= 0 ? '↗' : '↘'}</span>
            )}
          </span>
        </div>
        <ValueChart values={rs.valueHistory} totalPoints={rs.cfg.lengthMonths + 1} height={80} />
      </div>

      {/* ニュース */}
      {news && (
        <div className="px-4 pt-1">
          <CharacterBubble who="colin" animate={false}>
            📰 {news}
          </CharacterBubble>
        </div>
      )}

      {/* 資産カード */}
      <div className="flex flex-col gap-2 px-4 pt-2">
        {ASSETS.map((a) => {
          const held = rs.holdings[a.id];
          const ret = rs.turn > 0 ? monthlyReturn(market, a.id, idx) : 0;
          return (
            <div key={a.id} className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2">
              <span className="text-2xl">{a.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold leading-tight">{adultMode ? a.adultName : a.kidName}</div>
                <div className="text-xs text-slate-400">
                  {fmtYen(held, adultMode)}
                  {rs.turn > 0 && (
                    <span className={ret >= 0 ? 'ml-1 text-emerald-400' : 'ml-1 text-rose-400'}>
                      {adultMode
                        ? `${ret >= 0 ? '+' : ''}${(ret * 100).toFixed(1)}%`
                        : ret >= 0.02 ? '↑あがった' : ret <= -0.02 ? '↓さがった' : '→よこばい'}
                    </span>
                  )}
                </div>
              </div>
              <Button size="sm" variant="secondary" disabled={rs.holdings.cash < 1000} onClick={() => buyAsset(a.id, 1000)}>
                ＋1000えん
              </Button>
              <Button size="sm" variant="ghost" disabled={held < 1} onClick={() => sellAsset(a.id, Math.min(1000, held))}>
                {term('sell', adultMode)}
              </Button>
            </div>
          );
        })}

        {/* ちょきんばこ＋つみたてスイッチ */}
        <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2">
          <span className="text-2xl">{CASH_META.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{adultMode ? CASH_META.adultName : CASH_META.kidName}</div>
            <div className="text-xs text-slate-400">
              {fmtYen(rs.holdings.cash, adultMode)}（まいつき {term('allowance', adultMode)} +1000えん）
            </div>
          </div>
          {runsCompleted >= 1 && (
            <button
              onClick={toggleTsumitate}
              className={`rounded-xl px-2 py-1.5 text-xs font-bold ${
                rs.tsumitate ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-300'
              }`}
            >
              {rs.tsumitate ? '✓ ' : ''}こつこつ
            </button>
          )}
        </div>
        {runsCompleted >= 1 && rs.tsumitate && (
          <p className="px-1 text-xs text-emerald-300/80">
            ✓ {term('tsumitate', adultMode)}: おこづかいを まいつき はんぶんずつ じどうで かうよ
          </p>
        )}
      </div>

      {/* つぎのつきへ */}
      <div className="mt-auto px-4 pb-5 pt-3">
        <Button size="lg" onClick={advanceMonth} disabled={!!rs.pendingPanic || rs.finished}>
          ⏩ {term('nextMonth', adultMode)}
        </Button>
      </div>

      {/* チュートリアル（初回のみ・3ステップ） */}
      {showTutorial && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-slate-950/95 p-4 pb-6">
          <CharacterBubble who="colin">{TUTORIAL[tutStep]}</CharacterBubble>
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                if (tutStep + 1 >= TUTORIAL.length) setSettings({ tutorialDone: true });
                setTutStep(tutStep + 1);
              }}
            >
              わかった！
            </Button>
          </div>
        </div>
      )}

      {rs.pendingPanic && <PanicBattle panic={rs.pendingPanic} />}
    </div>
  );
}

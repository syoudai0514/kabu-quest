/**
 * 帰還シーケンス: じだいのタネあかし → 紙芝居 → もしもタイムライン → スコア
 * カタルシスの設計順序が本作の要（GDD §6.1, §6.4, §6.6）
 */
import { useEffect, useState } from 'react';
import Button from '../components/Button';
import CharacterBubble from '../components/CharacterBubble';
import ValueChart from '../components/ValueChart';
import StarRating from '../components/StarRating';
import { useGame } from '../../state/game';
import { useMeta } from '../../state/meta';
import { useSettings } from '../../state/settings';
import { monthAdd } from '../../domain/market/series';
import { HISTORICAL_EVENTS } from '../../domain/events/history';
import { fmtYen } from '../i18n/text';
import { MEDALS } from '../medals';
import { sfxAcorn, sfxFanfare } from '../../platform/sound';

type Step = 'reveal' | 'story' | 'moshimo' | 'score' | 'ending';

export default function ReturnScreen() {
  const { rs, result, finishReturn, startRun } = useGame();
  const { adultMode, sensitiveOn } = useSettings();
  const { zukanEvents, endingSeen, markEndingSeen } = useMeta();
  const [step, setStep] = useState<Step>('reveal');
  const [eventIdx, setEventIdx] = useState(0);
  const [pageIdx, setPageIdx] = useState(0);

  const broken = !rs || !result;
  useEffect(() => {
    if (broken) finishReturn();
  }, [broken, finishReturn]);
  if (!rs || !result) return null;

  // じだいずかんコンプ → 一度だけエンディング（とうしかのあかし。GDD §4）
  const allEventIds = HISTORICAL_EVENTS.filter((e) => sensitiveOn || !e.sensitive).map((e) => e.id);
  const zukanComplete = allEventIds.every((id) => zukanEvents.includes(id));
  const { score, moshimo, events, startMonth } = result;
  const endMonth = monthAdd(startMonth, rs.cfg.lengthMonths);
  const [sy, sm] = startMonth.split('-');
  const [ey, em] = endMonth.split('-');

  const finalValue = score.finalValue;
  const moshimoFinal = moshimo.values[moshimo.values.length - 1];
  const gap = moshimoFinal - finalValue;

  const next = () => {
    if (step === 'reveal') setStep(events.length > 0 ? 'story' : 'moshimo');
    else if (step === 'story') {
      const ev = events[eventIdx];
      if (pageIdx + 1 < ev.story.length) setPageIdx(pageIdx + 1);
      else if (eventIdx + 1 < events.length) {
        setEventIdx(eventIdx + 1);
        setPageIdx(0);
      } else setStep('moshimo');
    } else if (step === 'moshimo') {
      sfxAcorn();
      setStep('score');
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-indigo-950 to-slate-900 p-5">
      {step === 'reveal' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 kq-fadein">
          <div className="text-6xl">🛸</div>
          <p className="text-lg text-cyan-200">げんだいに かえってきた！</p>
          <CharacterBubble who="fukujii">
            おかえり。さて、タネあかしじゃ。<br />
            きみが いたのは——
          </CharacterBubble>
          <div className="kq-pop rounded-3xl bg-amber-100 px-6 py-4 text-center text-amber-950">
            <div className="text-2xl font-bold">
              {sy}ねん{Number(sm)}がつ
            </div>
            <div className="text-sm">〜 {ey}ねん{Number(em)}がつ 〜</div>
          </div>
          <Button size="lg" onClick={next}>
            くわしく きく
          </Button>
        </div>
      )}

      {step === 'story' && events[eventIdx] && (
        <div className="flex flex-1 flex-col gap-4 kq-fadein" key={`${eventIdx}-${pageIdx}`}>
          <div className="rounded-2xl bg-amber-100 px-4 py-2 text-center">
            <div className="text-lg font-bold text-amber-950">{events[eventIdx].kidTitle}</div>
            {adultMode && <div className="text-xs text-amber-800">{events[eventIdx].adultTitle}</div>}
          </div>
          <div className="flex-1">
            <CharacterBubble who="fukujii">
              <span className="text-base leading-relaxed">{events[eventIdx].story[pageIdx]}</span>
            </CharacterBubble>
            {pageIdx === events[eventIdx].story.length - 1 && (
              <div className="mt-3 rounded-2xl bg-violet-900/60 p-3 text-sm text-violet-100">
                🤔 {events[eventIdx].question}
              </div>
            )}
          </div>
          <div className="text-center text-xs text-slate-400">
            {pageIdx + 1} / {events[eventIdx].story.length}
          </div>
          <Button size="lg" onClick={next}>
            つぎへ ▶
          </Button>
        </div>
      )}

      {step === 'moshimo' && (
        <div className="flex flex-1 flex-col gap-4 kq-fadein">
          <h2 className="text-center text-lg font-bold text-yellow-200">もしもタイムライン</h2>
          <CharacterBubble who="fukujii">
            タイムマシンは、<b>えらばなかった みらい</b>も みせてくれるのじゃ。
          </CharacterBubble>
          <div className="rounded-2xl bg-white/5 p-3">
            <ValueChart
              values={rs.valueHistory}
              ghost={{ values: moshimo.values, label: moshimo.kidLabel }}
              height={140}
            />
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-sky-300">きみ: {fmtYen(finalValue, adultMode)}</span>
              <span className="text-yellow-300">もしも: {fmtYen(moshimoFinal, adultMode)}</span>
            </div>
          </div>
          <CharacterBubble who="colin">
            {moshimoComment(moshimo.kind, gap, adultMode)}
          </CharacterBubble>
          <div className="mt-auto">
            <Button size="lg" onClick={next}>
              けっかを みる ▶
            </Button>
          </div>
        </div>
      )}

      {step === 'score' && (
        <div className="flex flex-1 flex-col gap-4 kq-fadein">
          <h2 className="text-center text-xl font-bold text-amber-200">たびの けっか</h2>
          <StarRating stars={score.stars} />
          <div className="rounded-2xl bg-white/5 p-4 text-center">
            <div className="text-sm text-slate-400">もちかえった おかね</div>
            <div className="text-3xl font-bold text-emerald-300">{fmtYen(finalValue, adultMode)}</div>
            <div className="mt-1 text-xs text-slate-400">
              いれた おかね: {fmtYen(score.invested, adultMode)}
              {adultMode && ` ／ 現金のみなら: ${fmtYen(score.cashOnlyFinal, true)}`}
            </div>
          </div>

          {score.medals.length > 0 && (
            <div className="flex flex-col gap-2">
              {score.medals.map((m, i) => (
                <div
                  key={m}
                  className="kq-pop flex items-center gap-2 rounded-2xl bg-amber-900/40 px-3 py-2"
                  style={{ animationDelay: `${i * 0.25}s` }}
                >
                  <span className="text-2xl">{MEDALS[m].emoji}</span>
                  <div>
                    <div className="text-sm font-bold text-amber-200">{MEDALS[m].name}</div>
                    <div className="text-xs text-slate-300">{MEDALS[m].desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-amber-300">
            🌰 ×{score.acorns} ゲット！
          </div>

          {finalValue < score.invested && (
            <CharacterBubble who="fukujii">
              よう もちかえった。<b>しっぱいは もりで いちばん たかい たからもの</b> じゃよ。
            </CharacterBubble>
          )}

          <div className="mt-auto flex flex-col gap-2">
            <Button
              size="lg"
              onClick={() => {
                if (zukanComplete && !endingSeen) {
                  sfxFanfare();
                  setStep('ending');
                } else {
                  finishReturn();
                }
              }}
            >
              🌲 もりへ かえる
            </Button>
            <Button
              variant="ghost"
              onClick={() => startRun(rs.cfg.lengthMonths, rs.cfg.seed)}
            >
              🔁 もういちど おなじ じだいへ
            </Button>
          </div>
        </div>
      )}

      {step === 'ending' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 kq-fadein">
          <div className="text-6xl kq-pop">🎖️</div>
          <h2 className="text-xl font-bold text-amber-200">とうしかの あかし</h2>
          <CharacterBubble who="fukujii">
            すべての じだいを みてきたきみに、もう おしえることは ない。
            おまつりの あとも、こおりつく ふゆも、きみは じぶんの めで みてきたのじゃから。
          </CharacterBubble>
          <CharacterBubble who="fukujii">
            さいごに ひとつだけ。もう タイムマシンは いらんのじゃよ。<br />
            きみには <b>「じかん」という ほんものの タイムマシン</b>が あるからの。
            これから ながい ながい たびを、たのしんでな。
          </CharacterBubble>
          <CharacterBubble who="colin">ぼくも いっしょに いくよ！ おめでとう！！</CharacterBubble>
          <Button
            size="lg"
            onClick={() => {
              markEndingSeen();
              finishReturn();
            }}
          >
            🌲 もりへ かえる
          </Button>
        </div>
      )}
    </div>
  );
}

function moshimoComment(kind: string, gap: number, adultMode: boolean): string {
  const amount = fmtYen(Math.abs(gap), adultMode);
  switch (kind) {
    case 'ifHeld':
      return gap > 0
        ? `もし がまんできてたら、${amount} も おおきかったんだ…。つぎは パニックンに まけないぞ！`
        : `うってて せいかいだったみたい…。でもね、ながい めでみると がまんが かつことが おおいんだって。`;
    case 'ifSold':
      return gap < 0
        ? `もし うってたら ${amount} も ちいさかった！ がまんした きみ、ほんとうに すごいよ！`
        : `こんどは うったほうが よかったみたい…。でも だいじょうぶ、そんなときも あるさ！`;
    case 'ifCashOnly':
      return gap < 0
        ? `ちょきんばこ だけだと ${amount} ちいさかったよ。かぶが そだててくれたんだね！`
        : `こんどは ちょきんばこの ほうが つよかった…。そういう じだいも あるんだね。`;
    case 'ifInvested':
      return gap > 0
        ? `もし かぶを かってたら ${amount} おおきくなってたみたい！ こんどは ためしてみる？`
        : `かわなくて せいかいの じだいだった！ ようすを みるのも りっぱな さくせんだよ。`;
    default:
      return '';
  }
}

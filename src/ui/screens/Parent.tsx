/**
 * おうちのひとダッシュボード（GDD §11）
 * 主機能は分析ではなく「今夜の会話カード」。指標に優劣の色付けをしない。
 * 入口は暗算ゲート（個人情報不要の年齢ゲート慣行）。
 */
import { useMemo, useState } from 'react';
import Button from '../components/Button';
import { useGame } from '../../state/game';
import { useMeta } from '../../state/meta';
import { useSettings } from '../../state/settings';
import { buildParentReport } from '../../domain/scoring/parentReport';
import { HISTORICAL_EVENTS } from '../../domain/events/history';
import { DATA_SOURCES } from '../../state/marketData';

function makeGate() {
  const a = 11 + Math.floor(Math.random() * 8); // 11..18
  const b = 3 + Math.floor(Math.random() * 6); // 3..8
  return { q: `${a} × ${b} = ?`, answer: a * b };
}

export default function Parent() {
  const go = useGame((s) => s.go);
  const runLogs = useMeta((s) => s.runLogs);
  const { sensitiveOn, set: setSettings } = useSettings();
  const [gate] = useState(makeGate);
  const [input, setInput] = useState('');
  const [passed, setPassed] = useState(false);

  const report = useMemo(() => buildParentReport(runLogs), [runLogs]);

  if (!passed) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-900 p-6">
        <p className="text-sm text-slate-300">おうちのひと むけの がめんです。こたえを いれてね。</p>
        <div className="text-3xl font-bold text-slate-100">{gate.q}</div>
        <input
          type="number"
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-32 rounded-xl bg-white/10 px-3 py-2 text-center text-xl text-white outline-none"
          autoFocus
        />
        <div className="flex gap-2">
          <Button onClick={() => setPassed(Number(input) === gate.answer)}>はいる</Button>
          <Button variant="ghost" onClick={() => go('home')}>もどる</Button>
        </div>
      </div>
    );
  }

  const styleLabel =
    report.riskStyle < 0.34 ? 'コツコツ慎重派' : report.riskStyle < 0.67 ? 'バランス派' : 'チャレンジ冒険派';

  return (
    <div className="flex min-h-dvh flex-col gap-4 overflow-y-auto bg-slate-900 p-5 text-slate-100">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">保護者ダッシュボード</h1>
        <Button variant="ghost" size="sm" onClick={() => go('home')}>閉じる</Button>
      </header>

      {report.runCount === 0 ? (
        <p className="text-sm text-slate-300">まだプレイ記録がありません。お子さんが旅を終えると、ここにレポートが表示されます。</p>
      ) : (
        <>
          {/* 今夜の会話カード（本ダッシュボードの主目的） */}
          {report.card && (
            <section className="rounded-2xl border border-amber-400/40 bg-amber-950/40 p-4">
              <h2 className="text-sm font-bold text-amber-300">💬 今夜の会話カード</h2>
              <p className="mt-2 text-sm leading-relaxed">{report.card}</p>
            </section>
          )}

          <section className="rounded-2xl bg-white/5 p-4">
            <h2 className="text-sm font-bold text-slate-300">パニックンとの対戦成績（がまん力）</h2>
            <p className="mt-1 text-2xl font-bold">
              {report.panicRecord.wins}勝 {report.panicRecord.losses}敗
            </p>
            <p className="text-xs text-slate-400">勝ち=暴落時に「がまん」or「買い増し」を選択</p>
          </section>

          <section className="rounded-2xl bg-white/5 p-4">
            <h2 className="text-sm font-bold text-slate-300">投資スタイル（優劣ではなく性格です）</h2>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span>ちょきん中心</span>
              <div className="relative h-2 flex-1 rounded-full bg-slate-700">
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-sky-400"
                  style={{ left: `calc(${Math.round(report.riskStyle * 100)}% - 8px)` }}
                />
              </div>
              <span>ぜんぶ投資</span>
            </div>
            <p className="mt-2 text-sm font-bold">{styleLabel}</p>
            <p className="mt-2 text-xs text-slate-400">
              たまごわけ（分散）意識: {Math.round(report.eggAvg * 100)} / 100
            </p>
          </section>

          <section className="rounded-2xl bg-white/5 p-4">
            <h2 className="text-sm font-bold text-slate-300">体験した歴史イベント（{report.runCount}回の旅）</h2>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {report.experiencedEvents.map((id) => {
                const e = HISTORICAL_EVENTS.find((x) => x.id === id);
                return e ? <li key={id}>・{e.adultTitle}</li> : null;
              })}
              {report.experiencedEvents.length === 0 && <li className="text-slate-400">まだありません</li>}
            </ul>
          </section>
        </>
      )}

      <section className="rounded-2xl bg-white/5 p-4">
        <h2 className="text-sm font-bold text-slate-300">表示設定</h2>
        <label className="mt-2 flex items-center justify-between text-sm">
          災害イベント（東日本大震災）を含める
          <input
            type="checkbox"
            checked={sensitiveOn}
            onChange={(e) => setSettings({ sensitiveOn: e.target.checked })}
            className="h-5 w-5"
          />
        </label>
      </section>

      {/* 金融的な簡略化の明示（GDD §12）。正確性レビューの前提を親に開示する */}
      <section className="rounded-2xl bg-white/5 p-4 text-xs leading-relaxed text-slate-400">
        <h2 className="text-sm font-bold text-slate-300">このゲームの簡略化について</h2>
        <ul className="mt-2 list-disc pl-4">
          <li>指数は配当を含まない価格指数です（実際のリターンはこれより高くなります）</li>
          <li>S&P500は為替（円換算）を無視し、指数値をそのまま円として扱います</li>
          <li>手数料・税金・スプレッドはありません</li>
          <li>ちょきんばこの金利は0%固定です（高金利時代の預金は再現していません）</li>
          <li>時代の抽選は暴落期に意図的に当たりやすくしています（学習機会のため）</li>
          <li>S&P500は月中平均値、日経平均は月末終値です</li>
        </ul>
        <h2 className="mt-3 text-sm font-bold text-slate-300">データ出典</h2>
        <ul className="mt-1 list-disc pl-4">
          {DATA_SOURCES.map((s) => (
            <li key={s.label}>
              {s.label}: {s.name}（取得日 {s.retrievedAt}）
            </li>
          ))}
        </ul>
        <p className="mt-2">本アプリは教育目的のシミュレーションであり、投資助言ではありません。個人情報は一切収集せず、記録はこの端末内にのみ保存されます。</p>
      </section>
    </div>
  );
}

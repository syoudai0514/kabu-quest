/** ずかん: じだい（歴史イベント）・ことば（用語対訳）・メダル */
import { useState } from 'react';
import Button from '../components/Button';
import { useGame } from '../../state/game';
import { useMeta } from '../../state/meta';
import { useSettings } from '../../state/settings';
import { HISTORICAL_EVENTS } from '../../domain/events/history';
import { WORD_BOOK } from '../i18n/text';
import { MEDALS } from '../medals';
import type { MedalId } from '../../domain/scoring/scoring';

type Tab = 'jidai' | 'kotoba' | 'medal';

export default function Zukan() {
  const go = useGame((s) => s.go);
  const { zukanEvents, medals } = useMeta();
  const { adultMode, sensitiveOn } = useSettings();
  const [tab, setTab] = useState<Tab>('jidai');
  const [openId, setOpenId] = useState<string | null>(null);

  const events = HISTORICAL_EVENTS.filter((e) => sensitiveOn || !e.sensitive);

  return (
    <div className="flex min-h-dvh flex-col bg-slate-900 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-amber-200">📖 ずかん</h1>
        <Button variant="ghost" size="sm" onClick={() => go('home')}>
          もどる
        </Button>
      </header>

      <div className="mt-3 flex gap-2">
        {(
          [
            ['jidai', 'じだい'],
            ['kotoba', 'ことば'],
            ['medal', 'メダル'],
          ] as Array<[Tab, string]>
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-3 py-1.5 text-sm font-bold ${
              tab === t ? 'bg-amber-400 text-amber-950' : 'bg-white/10 text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 overflow-y-auto pb-6">
        {tab === 'jidai' &&
          events.map((e) => {
            const unlocked = zukanEvents.includes(e.id);
            const open = openId === e.id;
            return (
              <div key={e.id} className="rounded-2xl bg-white/5 px-3 py-2.5">
                <button
                  className="flex w-full items-center gap-2 text-left"
                  onClick={() => unlocked && setOpenId(open ? null : e.id)}
                >
                  <span className="text-2xl">{unlocked ? '📜' : '❓'}</span>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${unlocked ? '' : 'text-slate-500'}`}>
                      {unlocked ? e.kidTitle : '？？？？？'}
                    </div>
                    {unlocked && adultMode && <div className="text-xs text-slate-400">{e.adultTitle}</div>}
                  </div>
                  {unlocked && <span className="text-slate-400">{open ? '▲' : '▼'}</span>}
                </button>
                {open && (
                  <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-2 text-sm leading-relaxed text-slate-200">
                    {e.story.map((page, i) => (
                      <p key={i}>{page}</p>
                    ))}
                    <p className="rounded-xl bg-violet-900/50 p-2 text-violet-100">🤔 {e.question}</p>
                  </div>
                )}
              </div>
            );
          })}

        {tab === 'jidai' && (
          <p className="mt-1 text-center text-xs text-slate-500">
            {zukanEvents.length} / {events.length} の じだいを たいけんした
          </p>
        )}

        {tab === 'kotoba' &&
          WORD_BOOK.map((w) => (
            <div key={w.adult} className="rounded-2xl bg-white/5 px-3 py-2.5">
              <div className="text-sm font-bold text-amber-100">{w.kid}</div>
              <div className="text-xs text-slate-400">おとなの ことば: {w.adult}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-300">{w.kidNote}</div>
            </div>
          ))}

        {tab === 'medal' &&
          (Object.keys(MEDALS) as MedalId[]).map((id) => {
            const count = medals[id] ?? 0;
            return (
              <div
                key={id}
                className={`flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5 ${count === 0 ? 'opacity-40' : ''}`}
              >
                <span className="text-3xl">{count > 0 ? MEDALS[id].emoji : '🔒'}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold">{MEDALS[id].name}</div>
                  <div className="text-xs text-slate-400">{MEDALS[id].desc}</div>
                </div>
                {count > 0 && <span className="text-sm font-bold text-amber-300">×{count}</span>}
              </div>
            );
          })}
      </div>
    </div>
  );
}

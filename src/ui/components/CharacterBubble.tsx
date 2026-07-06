import type { ReactNode } from 'react';

export type Character = 'colin' | 'fukujii' | 'panic';

const AVATARS: Record<Character, { emoji: string; name: string; bg: string }> = {
  colin: { emoji: '🐿️', name: 'コリン', bg: 'bg-orange-300' },
  fukujii: { emoji: '🦉', name: 'フクじい', bg: 'bg-violet-300' },
  panic: { emoji: '👻', name: 'パニックン', bg: 'bg-purple-950' },
};

/**
 * キャラクターの吹き出し。
 * 絵文字アバターはMVPの代用。オリジナルSVGへの差し替えは docs/HANDOFF.md §5
 */
export default function CharacterBubble({
  who,
  children,
  animate = true,
}: {
  who: Character;
  children: ReactNode;
  animate?: boolean;
}) {
  const a = AVATARS[who];
  return (
    <div className="flex items-start gap-2 kq-fadein">
      <div className={`flex flex-col items-center shrink-0 ${animate ? 'kq-floaty' : ''}`}>
        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${a.bg}`}>
          {a.emoji}
        </div>
        <span className="mt-0.5 text-[10px] text-slate-300">{a.name}</span>
      </div>
      <div className="relative mt-1 flex-1 rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm leading-relaxed text-slate-800">
        {children}
      </div>
    </div>
  );
}

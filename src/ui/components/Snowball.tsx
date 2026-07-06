/**
 * 複利の主役: 資産＝雪だるま（GDD §6.5）
 *
 * 半径は資産の立方根でスケールする。線形だと後半の成長が画面に収まらず、
 * 立方根なら「体積∝資産」の比喩が保たれ、複利の加速も視覚化される。
 */
import { useEffect, useRef, useState } from 'react';

interface Props {
  /** 総資産（円） */
  value: number;
  /** 旅の進捗 0..1（坂を転がる位置） */
  progress: number;
  /** 直近月の増減（表情用） */
  lastChange: number;
}

function radiusFor(value: number): number {
  const r = 15 * Math.cbrt(Math.max(value, 100) / 10000);
  return Math.min(Math.max(r, 8), 42);
}

export default function Snowball({ value, progress, lastChange }: Props) {
  const r = radiusFor(value);
  const [displayR, setDisplayR] = useState(r);
  const prev = useRef(r);

  // サイズ変化をゆっくり追従させ、「雪がくっつく／欠ける」を感じさせる
  useEffect(() => {
    prev.current = displayR;
    const id = requestAnimationFrame(() => setDisplayR(r));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);

  const x = 30 + progress * 130;
  const groundY = 108;
  const cy = groundY - displayR;
  const happy = lastChange >= 0;

  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" role="img" aria-label="ゆきだるま">
      {/* 空と雪原 */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#3b5f8a" />
        </linearGradient>
      </defs>
      <rect width="200" height="120" fill="url(#sky)" />
      <circle cx="170" cy="20" r="10" fill="#fef3c7" opacity="0.9" />
      {/* ゆるい下り坂 */}
      <path d="M0,92 Q60,86 120,98 T200,104 L200,120 L0,120 Z" fill="#e2e8f0" />
      <path d="M0,96 Q60,90 120,102 T200,108 L200,120 L0,120 Z" fill="#f8fafc" />

      {/* 雪だるま本体（ゆらゆら転がる） */}
      <g className="kq-roll" style={{ transformOrigin: `${x}px ${groundY}px` }}>
        <circle
          cx={x}
          cy={cy}
          r={displayR}
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          style={{ transition: 'r 0.5s ease, cy 0.5s ease' }}
        />
        {/* 顔（雪だるまの上部に配置） */}
        <g style={{ transition: 'transform 0.5s ease' }} transform={`translate(${x}, ${cy - displayR * 0.25})`}>
          <circle cx={-displayR * 0.3} cy={0} r={Math.max(displayR * 0.07, 1.4)} fill="#334155" />
          <circle cx={displayR * 0.3} cy={0} r={Math.max(displayR * 0.07, 1.4)} fill="#334155" />
          <ellipse cx={0} cy={displayR * 0.12} rx={displayR * 0.12} ry={displayR * 0.1} fill="#fb923c" />
          {happy ? (
            <path
              d={`M${-displayR * 0.25},${displayR * 0.32} Q0,${displayR * 0.48} ${displayR * 0.25},${displayR * 0.32}`}
              stroke="#334155"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <path
              d={`M${-displayR * 0.25},${displayR * 0.42} Q0,${displayR * 0.28} ${displayR * 0.25},${displayR * 0.42}`}
              stroke="#334155"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          )}
        </g>
      </g>

      {/* ゴールの旗 */}
      <g transform="translate(184, 84)">
        <line x1="0" y1="0" x2="0" y2="20" stroke="#94a3b8" strokeWidth="2" />
        <path d="M0,0 L12,4 L0,8 Z" fill="#f43f5e" />
      </g>
    </svg>
  );
}

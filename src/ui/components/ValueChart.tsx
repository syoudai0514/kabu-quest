/**
 * 資産推移チャート（SVG手描き・ライブラリ不使用）
 * こどもモードでは目盛りを出さず「山のかたち」として見せる。
 * ghost = もしもタイムライン（半透明のもうひとつの時間線）
 */
import { useSettings } from '../../state/settings';
import { fmtYen } from '../i18n/text';

interface Props {
  values: number[];
  /** 全体の長さ（旅の月数+1）。valuesが途中でも横軸を固定する */
  totalPoints?: number;
  ghost?: { values: number[]; label: string };
  /** 入金累計線（おとなモード時のみ描画） */
  invested?: number[];
  height?: number;
}

const W = 320;

export default function ValueChart({ values, totalPoints, ghost, invested, height = 110 }: Props) {
  const adultMode = useSettings((s) => s.adultMode);
  const H = height;
  const n = Math.max(totalPoints ?? values.length, 2);
  const all = [...values, ...(ghost?.values ?? []), ...(invested ?? [])];
  const max = Math.max(...all) * 1.05;
  const min = Math.min(...all, 0) * 0.95;

  const pt = (i: number, v: number) =>
    `${(i / (n - 1)) * (W - 8) + 4},${H - 6 - ((v - min) / (max - min)) * (H - 16)}`;

  const line = (vs: number[]) => vs.map((v, i) => pt(i, v)).join(' ');

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="しさんのグラフ">
        {/* 実績エリア */}
        <polygon
          points={`4,${H - 6} ${line(values)} ${pt(values.length - 1, values[values.length - 1]).split(',')[0]},${H - 6}`}
          fill="#38bdf8"
          opacity="0.15"
        />
        {ghost && (
          <polyline
            points={line(ghost.values)}
            fill="none"
            stroke="#facc15"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            opacity="0.85"
          />
        )}
        {invested && adultMode && (
          <polyline points={line(invested)} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 3" />
        )}
        <polyline
          points={line(values)}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 現在地マーカー */}
        <circle
          cx={pt(values.length - 1, values[values.length - 1]).split(',')[0]}
          cy={pt(values.length - 1, values[values.length - 1]).split(',')[1]}
          r="4"
          fill="#f0f9ff"
          stroke="#0284c7"
          strokeWidth="2"
        />
      </svg>
      {adultMode && (
        <div className="pointer-events-none absolute right-1 top-0 text-[10px] text-slate-400">
          {fmtYen(max / 1.05, true)}
        </div>
      )}
      {ghost && (
        <div className="mt-1 flex items-center gap-1 text-xs text-yellow-300">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-yellow-300" />
          {ghost.label}
        </div>
      )}
    </div>
  );
}

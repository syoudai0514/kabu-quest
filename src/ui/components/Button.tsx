import type { ReactNode } from 'react';
import { sfxTap } from '../../platform/sound';
import { vibrate } from '../../platform/haptics';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'md' | 'lg' | 'sm';
  disabled?: boolean;
  className?: string;
}

const VARIANTS = {
  primary: 'bg-amber-400 text-amber-950 shadow-[0_4px_0_#b45309] active:shadow-none active:translate-y-1',
  secondary: 'bg-sky-500 text-white shadow-[0_4px_0_#0369a1] active:shadow-none active:translate-y-1',
  danger: 'bg-rose-500 text-white shadow-[0_4px_0_#9f1239] active:shadow-none active:translate-y-1',
  ghost: 'bg-white/10 text-slate-100',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-4 py-2.5 text-base rounded-2xl',
  lg: 'px-6 py-4 text-xl rounded-3xl w-full',
};

/** 全ボタン共通: タップ音＋振動＋押し込み。手触りに妥協しない（GDD §10） */
export default function Button({ children, onClick, variant = 'primary', size = 'md', disabled, className = '' }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`font-bold transition-transform select-none disabled:opacity-40 disabled:shadow-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      onClick={() => {
        sfxTap();
        vibrate(12);
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

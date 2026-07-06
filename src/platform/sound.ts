/**
 * 効果音（WebAudio合成）
 *
 * 音源ファイルを持たず全てオシレータ合成で鳴らす。
 * 理由: PWAのオフライン完全対応・バンドル軽量化・ライセンス管理不要。
 * 「雪がくっつく音／欠ける音／どんぐりの音」の3つが感情のアンカー（GDD §10）。
 * 差し替えは docs/HANDOFF.md §5。
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface Tone {
  freq: number;
  /** 秒 */
  dur: number;
  type?: OscillatorType;
  /** 開始遅延（秒） */
  at?: number;
  vol?: number;
  /** 終了周波数（スライド） */
  to?: number;
}

function play(tones: Tone[]): void {
  const c = ac();
  if (!c) return;
  const now = c.currentTime;
  for (const t of tones) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const start = now + (t.at ?? 0);
    osc.type = t.type ?? 'sine';
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, start + t.dur);
    const v = t.vol ?? 0.12;
    gain.gain.setValueAtTime(v, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }
}

/** タップ */
export function sfxTap(): void {
  play([{ freq: 880, dur: 0.06, type: 'triangle', vol: 0.08 }]);
}

/** 雪がくっつく（資産増） */
export function sfxGrow(): void {
  play([
    { freq: 520, dur: 0.1, type: 'sine' },
    { freq: 780, dur: 0.12, at: 0.06, type: 'sine' },
  ]);
}

/** 氷が欠ける（資産減） */
export function sfxShrink(): void {
  play([
    { freq: 300, dur: 0.12, type: 'square', vol: 0.05 },
    { freq: 180, dur: 0.18, at: 0.07, type: 'square', vol: 0.05 },
  ]);
}

/** どんぐりコロコロ（報酬） */
export function sfxAcorn(): void {
  play([
    { freq: 660, dur: 0.08, type: 'triangle' },
    { freq: 880, dur: 0.08, at: 0.09, type: 'triangle' },
    { freq: 1100, dur: 0.14, at: 0.18, type: 'triangle' },
  ]);
}

/** パニックン出現 */
export function sfxPanic(): void {
  play([
    { freq: 220, dur: 0.5, type: 'sawtooth', vol: 0.06, to: 110 },
    { freq: 330, dur: 0.5, at: 0.1, type: 'sawtooth', vol: 0.04, to: 165 },
  ]);
}

/** ファンファーレ（帰還・メダル） */
export function sfxFanfare(): void {
  play([
    { freq: 523, dur: 0.15, type: 'triangle' },
    { freq: 659, dur: 0.15, at: 0.15, type: 'triangle' },
    { freq: 784, dur: 0.15, at: 0.3, type: 'triangle' },
    { freq: 1046, dur: 0.4, at: 0.45, type: 'triangle', vol: 0.15 },
  ]);
}

/** タイムマシン発進 */
export function sfxTimeMachine(): void {
  play([
    { freq: 200, dur: 1.0, type: 'sine', to: 1200, vol: 0.08 },
    { freq: 205, dur: 1.0, at: 0.05, type: 'sine', to: 1210, vol: 0.06 },
  ]);
}

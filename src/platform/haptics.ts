/** タップの手触り。非対応端末では静かに何もしない */
export function vibrate(pattern: number | number[] = 15): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

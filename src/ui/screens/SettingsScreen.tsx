/** せってい */
import Button from '../components/Button';
import { useGame } from '../../state/game';
import { useSettings } from '../../state/settings';

export default function SettingsScreen() {
  const go = useGame((s) => s.go);
  const { adultMode, soundOn, shakeOn, set } = useSettings();

  const Row = ({ label, note, value, onChange }: { label: string; note?: string; value: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
      <div>
        <div className="text-sm font-bold">{label}</div>
        {note && <div className="text-xs text-slate-400">{note}</div>}
      </div>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-6 w-6" />
    </label>
  );

  return (
    <div className="flex min-h-dvh flex-col gap-3 bg-slate-900 p-5 text-slate-100">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-amber-200">⚙️ せってい</h1>
        <Button variant="ghost" size="sm" onClick={() => go('home')}>もどる</Button>
      </header>

      <Row
        label="おとなモード"
        note="ほんとうの ねんごうや すうじで ひょうじ"
        value={adultMode}
        onChange={(v) => set({ adultMode: v })}
      />
      <Row label="おと" value={soundOn} onChange={(v) => set({ soundOn: v })} />
      <Row
        label="がめんの ゆれ"
        note="パニックンが でたときの ゆれ"
        value={shakeOn}
        onChange={(v) => set({ shakeOn: v })}
      />

      <p className="mt-auto pb-2 text-center text-xs text-slate-500">
        カブクエスト v0.1<br />
        データはこの端末の中にだけ保存されます
      </p>
    </div>
  );
}

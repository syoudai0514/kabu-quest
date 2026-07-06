import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setSoundEnabled } from '../platform/sound';

interface SettingsState {
  adultMode: boolean;
  soundOn: boolean;
  /** パニックン出現時の画面シェイク（感覚過敏への配慮でOFF可） */
  shakeOn: boolean;
  /** 震災など保護者が選べるイベントの表示（GDD §6.6） */
  sensitiveOn: boolean;
  tutorialDone: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      adultMode: false,
      soundOn: true,
      shakeOn: true,
      sensitiveOn: true,
      tutorialDone: false,
      set: (patch) => {
        if (patch.soundOn !== undefined) setSoundEnabled(patch.soundOn);
        set(patch);
      },
    }),
    {
      name: 'kq-settings',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) setSoundEnabled(state.soundOn);
      },
    },
  ),
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage, STORE_VERSION } from './persist';

export const useSettings = create(
  persist(
    (set) => ({
      frets: 18, // 15 | 18 | 22
      tuning: 'standard', // 'standard' | 'dropD' | 'openG'
      themeMode: 'dark', // 'dark' | 'light'

      // Fixed, with no setting exposed. The tuner reads this; 440Hz is the
      // near-universal reference and changing it is a rare, expert need.
      a4: 440,

      setFrets: (frets) => set({ frets }),
      setTuning: (tuning) => set({ tuning }),
      setThemeMode: (themeMode) => set({ themeMode }),
    }),
    {
      name: 'fretmate:settings',
      storage,
      version: STORE_VERSION,
      // a4 is a constant, not a preference — no point storing it
      partialize: (s) => ({ frets: s.frets, tuning: s.tuning, themeMode: s.themeMode }),
    }
  )
);

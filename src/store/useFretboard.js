import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage, STORE_VERSION } from './persist';

export const useFretboard = create(
  persist(
    (set) => ({
      root: 9, // pitch class, default A
      scaleType: 'minorPentatonic',
      position: 'all', // 'all' | 0 | 1 | 2 | 3 | 4

      setRoot: (root) => set({ root }),
      setScale: (scaleType) => set({ scaleType, position: 'all' }),
      setPosition: (position) => set({ position }),
    }),
    {
      name: 'fretmate:fretboard',
      storage,
      version: STORE_VERSION,
      partialize: (s) => ({ root: s.root, scaleType: s.scaleType, position: s.position }),
    }
  )
);

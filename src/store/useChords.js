import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage, STORE_VERSION } from './persist';

export const useChords = create(
  persist(
    (set) => ({
      root: 0, // pitch class, default C
      chordType: 'major',
      viewMode: 'caged', // 'caged' (full barre voicings) | 'triads' (3-string shapes)
      stringSet: 3, // index into STRING_SETS — defaults to the top set, G–B–e
      shapeIndex: 0, // which voicing: a CAGED form, or an inversion in triad mode

      setRoot: (root) => set({ root, shapeIndex: 0 }),
      setChordType: (chordType) => set({ chordType, shapeIndex: 0 }),
      // Triads only exist for the four three-note qualities, so switching into
      // triad mode from, say, a dom7 has to land somewhere valid.
      setViewMode: (viewMode) =>
        set((s) => ({
          viewMode,
          shapeIndex: 0,
          chordType:
            viewMode === 'triads' && !['major', 'minor', 'dim', 'aug'].includes(s.chordType)
              ? 'major'
              : s.chordType,
        })),
      setStringSet: (stringSet) => set({ stringSet, shapeIndex: 0 }),
      setShapeIndex: (shapeIndex) => set({ shapeIndex }),
    }),
    {
      name: 'fretmate:chords',
      storage,
      version: STORE_VERSION,
      // shapeIndex is safe to restore: the screen clamps it against however
      // many voicings the restored chord type actually has.
      partialize: (s) => ({
        root: s.root,
        chordType: s.chordType,
        viewMode: s.viewMode,
        stringSet: s.stringSet,
        shapeIndex: s.shapeIndex,
      }),
    }
  )
);

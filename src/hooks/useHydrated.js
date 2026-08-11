import { useEffect, useState } from 'react';
import { useSettings } from '../store/useSettings';
import { useFretboard } from '../store/useFretboard';
import { useChords } from '../store/useChords';
import { usePractice } from '../store/usePractice';

const STORES = [useSettings, useFretboard, useChords, usePractice];

// Waits for every persisted store to load. Painting before that flashes default state (e.g. dark theme for a light-mode user).
export default function useHydrated() {
  const [hydrated, setHydrated] = useState(() => STORES.every((s) => s.persist.hasHydrated()));

  useEffect(() => {
    if (hydrated) return undefined;

    const check = () => {
      if (STORES.every((s) => s.persist.hasHydrated())) setHydrated(true);
    };
    const unsubs = STORES.map((s) => s.persist.onFinishHydration(check));
    check(); // in case everything landed between render and effect

    // never leave a blank screen if storage misbehaves
    const bail = setTimeout(() => setHydrated(true), 1500);

    return () => {
      unsubs.forEach((u) => u && u());
      clearTimeout(bail);
    };
  }, [hydrated]);

  return hydrated;
}

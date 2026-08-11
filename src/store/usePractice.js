import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage, STORE_VERSION } from './persist';
import { beatIntervalMs } from '../lib/tempo';

const MIN_BPM = 40;
const MAX_BPM = 240;

function clampBpm(n) {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));
}

export const usePractice = create(
  persist(
    (set, get) => ({
      // --- metronome ---
      bpm: 100,
      isPlaying: false,
      beatsPerMeasure: 4, // 2, 3, 4, 6
      accentFirst: true,
      hapticsEnabled: true,
      currentBeat: 0, // 0-indexed within the measure, driven by the engine
      tapTimes: [],

      setBpm: (bpm) => set({ bpm: clampBpm(bpm) }),
      nudgeBpm: (delta) => set((s) => ({ bpm: clampBpm(s.bpm + delta) })),
      setBeatsPerMeasure: (n) => set({ beatsPerMeasure: n, currentBeat: 0 }),
      toggleAccentFirst: () => set((s) => ({ accentFirst: !s.accentFirst })),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
      play: () => set({ isPlaying: true, currentBeat: 0 }),
      stop: () => set({ isPlaying: false, currentBeat: 0 }),
      togglePlay: () =>
        set((s) => (s.isPlaying ? { isPlaying: false, currentBeat: 0 } : { isPlaying: true, currentBeat: 0 })),
      advanceBeat: () => set((s) => ({ currentBeat: (s.currentBeat + 1) % s.beatsPerMeasure })),

      // Tap-tempo: average the gaps between the last few taps (within 2.5s of
      // each other) into a BPM. Resets naturally if the person pauses too long.
      tapTempo: () => {
        const now = Date.now();
        const recent = [...get().tapTimes, now].filter((t) => now - t < 2500).slice(-6);
        set({ tapTimes: recent });
        if (recent.length >= 2) {
          const gaps = [];
          for (let i = 1; i < recent.length; i++) gaps.push(recent[i] - recent[i - 1]);
          const avgMs = gaps.reduce((a, b) => a + b, 0) / gaps.length;
          set({ bpm: clampBpm(60000 / avgMs) });
        }
      },

      // --- practice timer (simple stopwatch, no targets/stats) ---
      timerSeconds: 0,
      timerRunning: false,

      startTimer: () => set({ timerRunning: true }),
      pauseTimer: () => set({ timerRunning: false }),
      resetTimer: () => set({ timerRunning: false, timerSeconds: 0 }),
      toggleTimer: () => set((s) => ({ timerRunning: !s.timerRunning })),
      tickTimer: () => set((s) => ({ timerSeconds: s.timerSeconds + 1 })),
    }),
    {
      name: 'fretmate:practice',
      storage,
      version: STORE_VERSION,
      // settings only — restoring isPlaying/timerRunning would reopen mid-click
      partialize: (s) => ({
        bpm: s.bpm,
        beatsPerMeasure: s.beatsPerMeasure,
        accentFirst: s.accentFirst,
        hapticsEnabled: s.hapticsEnabled,
      }),
    }
  )
);

export const BPM_RANGE = { min: MIN_BPM, max: MAX_BPM };
export const BEATS_OPTIONS = [2, 3, 4, 6];

// re-exported so screens can keep importing everything metronome-related
// from one place
export { beatIntervalMs };

export function formatTimer(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

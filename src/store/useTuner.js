import { create } from 'zustand';

export const useTuner = create((set) => ({
  listening: false,
  frequency: null, // Hz, last detected
  note: null, // { name, octave, cents, midi, freq } from freqToNote
  selectedString: null, // index 0..5, or null for auto-detect nearest
  error: null, // user-facing message, e.g. permission denied or platform gap
  debugInfo: null, // { sampleCount, rms } — shown on screen while diagnosing capture issues

  setListening: (listening) => set({ listening, error: listening ? null : undefined }),
  setReading: (frequency, note) => set({ frequency, note }),
  clearReading: () => set({ frequency: null, note: null }),
  setSelectedString: (selectedString) => set({ selectedString }),
  setError: (error) => set({ error, listening: false }),
  setDebugInfo: (debugInfo) => set({ debugInfo }),
}));

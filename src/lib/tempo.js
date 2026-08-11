// Pure tempo maths, kept out of the store so it can be reasoned about (and
// tested) without dragging storage or React state along with it.

// Milliseconds between beats. BPM means quarter notes, as on any metronome.
export function beatIntervalMs(bpm) {
  return 60000 / bpm;
}

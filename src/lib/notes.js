// Pitch classes: C = 0 ... B = 11
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// The 12 chromatic roots, in the order shown to the user.
export const ROOTS = NOTE_NAMES.map((name, pc) => ({ name, pc }));

// Tunings: offsets = open pitch classes (0=low E..5=high e), openMidi = absolute pitch (needed for box shapes), names = display labels.
export const TUNINGS = {
  standard: {
    key: 'standard',
    label: 'Standard',
    offsets: [4, 9, 2, 7, 11, 4],
    openMidi: [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
    names: ['E', 'A', 'D', 'G', 'B', 'E'],
  },
  dropD: {
    key: 'dropD',
    label: 'Drop D',
    offsets: [2, 9, 2, 7, 11, 4],
    openMidi: [38, 45, 50, 55, 59, 64], // D2 A2 D3 G3 B3 E4
    names: ['D', 'A', 'D', 'G', 'B', 'E'],
  },
  openG: {
    key: 'openG',
    label: 'Open G',
    offsets: [2, 7, 2, 7, 11, 2],
    openMidi: [38, 43, 50, 55, 59, 62], // D2 G2 D3 G3 B3 D4
    names: ['D', 'G', 'D', 'G', 'B', 'D'],
  },
};

// Standard tuner reference: which pitch class each of the 6 strings targets.
export const TUNER_PRESETS = {
  standard: { key: 'standard', label: 'Standard', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  dropD: { key: 'dropD', label: 'Drop D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  openG: { key: 'openG', label: 'Open G', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
};

export function mod12(n) {
  return ((n % 12) + 12) % 12;
}

export function pcName(pc, useFlats = false) {
  return (useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES)[mod12(pc)];
}

// Pitch class sounding at a given fret on a string with a given open pitch class.
export function noteAt(openPc, fret) {
  return mod12(openPc + fret);
}

// Semitone interval (0..11) from a root pitch class to another pitch class.
export function intervalFrom(rootPc, pc) {
  return mod12(pc - rootPc);
}

// Parses a natural-note-name string like "E2" or "D3" into { pc, octave }.
// Only handles naturals (no sharps/flats) since that's all TUNER_PRESETS uses.
export function parseNoteOctave(str) {
  const name = str.slice(0, -1);
  const octave = parseInt(str.slice(-1), 10);
  const pc = NOTE_NAMES.indexOf(name);
  return { pc, octave };
}

// MIDI note number for a pitch class + octave (MIDI 69 = A4).
export function pcOctaveToMidi(pc, octave) {
  return (octave + 1) * 12 + pc;
}

// Frequency in Hz for a MIDI note number, against a configurable A4 reference.
export function midiToFreq(midi, a4 = 440) {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

// Frequency in Hz for a note-octave string like "E2", against a configurable A4.
export function noteOctaveToFreq(str, a4 = 440) {
  const { pc, octave } = parseNoteOctave(str);
  return midiToFreq(pcOctaveToMidi(pc, octave), a4);
}

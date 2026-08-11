import { mod12, NOTE_NAMES } from './notes';

// NOTE: chord shapes count 0 = high e ... 5 = low E (opposite the fretboard's 0 = low E). See toFretboardNotes.
export const CHORD_STRING_ORDER = ['e', 'B', 'G', 'D', 'A', 'E'];

// Open-string pitch classes in CHORD order (0 = high e ... 5 = low E).
const OPEN_PC = [4, 11, 7, 2, 9, 4];

export const CHORD_TYPES = {
  major: { key: 'major', label: 'Major', suffix: '', intervals: [0, 4, 7] },
  minor: { key: 'minor', label: 'Minor', suffix: 'm', intervals: [0, 3, 7] },
  dom7: { key: 'dom7', label: 'Dom 7', suffix: '7', intervals: [0, 4, 7, 10] },
  maj7: { key: 'maj7', label: 'Maj 7', suffix: 'maj7', intervals: [0, 4, 7, 11] },
  min7: { key: 'min7', label: 'Min 7', suffix: 'm7', intervals: [0, 3, 7, 10] },
  sus2: { key: 'sus2', label: 'Sus 2', suffix: 'sus2', intervals: [0, 2, 7] },
  sus4: { key: 'sus4', label: 'Sus 4', suffix: 'sus4', intervals: [0, 5, 7] },
  power5: { key: 'power5', label: 'Power 5', suffix: '5', intervals: [0, 7] },
  maj6: { key: 'maj6', label: '6th', suffix: '6', intervals: [0, 4, 7, 9] },
  min6: { key: 'min6', label: 'Min 6', suffix: 'm6', intervals: [0, 3, 7, 9] },
  add9: { key: 'add9', label: 'Add 9', suffix: 'add9', intervals: [0, 2, 4, 7] },
  dim: { key: 'dim', label: 'Dim', suffix: 'dim', intervals: [0, 3, 6] },
  dim7: { key: 'dim7', label: 'Dim 7', suffix: 'dim7', intervals: [0, 3, 6, 9] },
  m7b5: { key: 'm7b5', label: 'Min 7\u266d5', suffix: 'm7b5', intervals: [0, 3, 6, 10] },
  aug: { key: 'aug', label: 'Aug', suffix: 'aug', intervals: [0, 4, 8] },
};

export const CHORD_TYPE_LIST = Object.values(CHORD_TYPES);

// The five CAGED forms. `offsets` are low-E-first fret distances from the barre
// (null = muted). `rootOpenPc`/`rootOffset` place the root; `barreSpan` is the
// barred strings. C/G forms only list qualities with a real movable shape.
export const FORMS = [
  {
    key: 'eForm',
    label: 'E-Form',
    rootOpenPc: 4, // root on the low E string
    rootOffset: 0,
    barreSpan: [0, 5],
    shapes: {
      major: [0, 2, 2, 1, 0, 0],
      minor: [0, 2, 2, 0, 0, 0],
      dom7: [0, 2, 0, 1, 0, 0],
      maj7: [0, 2, 1, 1, 0, 0],
      min7: [0, 2, 0, 0, 0, 0],
      sus2: [0, 2, 4, 4, 0, 0],
      sus4: [0, 2, 2, 2, 0, 0],
      power5: [0, 2, 2, null, null, null],
      maj6: [0, 2, 2, 1, 2, 0],
      min6: [0, 2, 2, 0, 2, 0],
      add9: [0, 2, 2, 1, 0, 2],
      dim: [0, 1, 2, 0, null, null],
      dim7: [0, 1, 2, 0, 2, null],
      m7b5: [0, 1, 0, 0, null, null],
      aug: [0, 3, 2, 1, 1, null],
    },
  },
  {
    key: 'aForm',
    label: 'A-Form',
    rootOpenPc: 9, // root on the A string
    rootOffset: 0,
    barreSpan: [0, 4],
    shapes: {
      major: [null, 0, 2, 2, 2, 0],
      minor: [null, 0, 2, 2, 1, 0],
      dom7: [null, 0, 2, 0, 2, 0],
      maj7: [null, 0, 2, 1, 2, 0],
      min7: [null, 0, 2, 0, 1, 0],
      sus2: [null, 0, 2, 2, 0, 0],
      sus4: [null, 0, 2, 2, 3, 0],
      power5: [null, 0, 2, 2, null, null],
      maj6: [null, 0, 2, 2, 2, 2],
      min6: [null, 0, 2, 2, 1, 2],
      add9: [null, 0, 2, 4, 2, null],
      dim: [null, 0, 1, 2, 1, null],
      dim7: [null, 0, 1, 2, 1, 2],
      m7b5: [null, 0, 1, 0, 1, null],
      aug: [null, 0, 3, 2, 2, null],
    },
  },
  {
    key: 'cForm',
    label: 'C-Form',
    rootOpenPc: 9, // root on the A string, three frets above the barre
    rootOffset: 3,
    barreSpan: [0, 2],
    shapes: {
      major: [null, 3, 2, 0, 1, 0],
      dom7: [null, 3, 2, 3, 1, 0],
      maj7: [null, 3, 2, 0, 0, 0],
    },
  },
  {
    key: 'gForm',
    label: 'G-Form',
    rootOpenPc: 4, // root on the low E string, three frets above the barre
    rootOffset: 3,
    barreSpan: [1, 3],
    shapes: {
      major: [3, 2, 0, 0, 0, 3],
      dom7: [3, 2, 0, 0, 0, 1],
      maj7: [3, 2, 0, 0, 0, 2],
    },
  },
  {
    key: 'dForm',
    label: 'D-Form',
    rootOpenPc: 2, // root on the D string, at the barre
    rootOffset: 0,
    barreSpan: null, // only one string sits at the barre — nothing to bar
    shapes: {
      major: [null, null, 0, 2, 3, 2],
      minor: [null, null, 0, 2, 3, 1],
      dom7: [null, null, 0, 2, 1, 2],
      maj7: [null, null, 0, 2, 2, 2],
      min7: [null, null, 0, 2, 1, 1],
      sus2: [null, null, 0, 2, 3, 0],
      sus4: [null, null, 0, 2, 3, 3],
      power5: [null, null, 0, 2, 3, null],
      maj6: [null, null, 0, 2, 0, 2],
      min6: [null, null, 0, 2, 0, 1],
      dim: [null, null, 0, 1, 3, 1],
      dim7: [null, null, 0, 1, 0, 1],
      m7b5: [null, null, 0, 1, 1, 1],
      aug: [null, null, 0, 3, 3, 2],
    },
  },
];

export function chordName(rootPc, typeKey) {
  return NOTE_NAMES[mod12(rootPc)] + (CHORD_TYPES[typeKey]?.suffix ?? '');
}

// Pitch class sounding on a chord-order string at a given fret.
function pcAt(chordString, fret) {
  return mod12(OPEN_PC[chordString] + fret);
}

function buildForm(form, rootPc, typeKey) {
  const lowFirst = form.shapes[typeKey];
  if (!lowFirst) return null;

  // if the root would sit below the nut, move the shape up an octave
  let barreFret = mod12(rootPc - form.rootOpenPc) - form.rootOffset;
  if (barreFret < 0) barreFret += 12;

  const frets = [...lowFirst]
    .reverse()
    .map((o) => (o === null ? null : barreFret + o));

  // At fret 0 the "barre" is just the nut — the shape is the open chord.
  const barre =
    form.barreSpan && barreFret > 0
      ? { fret: barreFret, fromString: form.barreSpan[0], toString: form.barreSpan[1] }
      : null;

  return {
    frets,
    barreFret,
    barre,
    form: form.key,
    label: form.label,
    isOpen: barreFret === 0,
  };
}

// Every voicing for a chord, sorted up the neck (not fixed CAGED order).
export function getChordShapes(rootPc, typeKey) {
  return FORMS.map((f) => buildForm(f, rootPc, typeKey))
    .filter(Boolean)
    .sort((a, b) => a.barreFret - b.barreFret)
    .map((s) => ({
      ...s,
      name: chordName(rootPc, typeKey),
      rootPc: mod12(rootPc),
      typeKey,
      notes: shapeNotes(s.frets, rootPc),
    }));
}

// Pitch classes a shape actually sounds, with each one's interval from the root.
export function shapeNotes(frets, rootPc) {
  return frets.map((f, i) => {
    if (f === null || f === undefined) return null;
    const pc = pcAt(i, f);
    return { pc, interval: mod12(pc - rootPc), isRoot: mod12(pc - rootPc) === 0 };
  });
}

export function shapeIntervals(frets, rootPc) {
  const set = new Set();
  shapeNotes(frets, rootPc).forEach((n) => {
    if (n) set.add(n.interval);
  });
  return [...set].sort((a, b) => a - b);
}

// Converts a chord shape to fretboard format, flipping string order.
export function toFretboardNotes(shape) {
  const out = [];
  shape.frets.forEach((f, chordString) => {
    if (f === null || f === undefined) return;
    const pc = pcAt(chordString, f);
    const interval = mod12(pc - shape.rootPc);
    out.push({ string: 5 - chordString, fret: f, pc, interval, isRoot: interval === 0 });
  });
  return out;
}

// --- TRIADS: 3-note close voicings on 3 adjacent strings, derived (not
// tabled) by stacking the bass tone then each next-higher chord tone. ---

// Open-string MIDI pitches in CHORD order (0 = high e ... 5 = low E).
const CHORD_OPEN_MIDI = [64, 59, 55, 50, 45, 40];

export const TRIAD_QUALITIES = ['major', 'minor', 'dim', 'aug'];

// Each set lists its strings LOW to HIGH, in chord-order indices.
export const STRING_SETS = [
  { key: 'ead', label: 'E–A–D', strings: [5, 4, 3] },
  { key: 'adg', label: 'A–D–G', strings: [4, 3, 2] },
  { key: 'dgb', label: 'D–G–B', strings: [3, 2, 1] },
  { key: 'gbe', label: 'G–B–e', strings: [2, 1, 0] },
];

export const INVERSIONS = [
  { key: 0, label: 'Root', bass: 'root' },
  { key: 1, label: '1st inv', bass: '3rd' },
  { key: 2, label: '2nd inv', bass: '5th' },
];

// Bass on the lowest string; each higher string takes the next chord tone above it.
function voiceTriad(order, strings, bassFret, maxFret) {
  const frets = [null, null, null, null, null, null];
  let prevPitch = -1;
  for (let k = 0; k < 3; k++) {
    const s = strings[k];
    const open = CHORD_OPEN_MIDI[s];
    let fret;
    if (k === 0) {
      fret = bassFret;
    } else {
      fret = mod12(order[k] - mod12(open));
      while (open + fret <= prevPitch) fret += 12;
    }
    if (fret < 0 || fret > maxFret) return null;
    frets[s] = fret;
    prevPitch = open + fret;
  }
  return frets;
}

function buildTriad(rootPc, typeKey, setIndex, inversion, maxFret = 15) {
  const intervals = CHORD_TYPES[typeKey]?.intervals;
  if (!intervals || intervals.length !== 3) return null;

  // rotate so the requested tone is in the bass
  const order = [0, 1, 2].map((i) => mod12(rootPc + intervals[(inversion + i) % 3]));
  const strings = STRING_SETS[setIndex].strings;
  const bassOpen = CHORD_OPEN_MIDI[strings[0]];
  const baseFret = mod12(order[0] - mod12(bassOpen));

  // try both octave placements for the bass, keep whichever is more compact
  let best = null;
  for (const bf of [baseFret, baseFret + 12]) {
    const frets = voiceTriad(order, strings, bf, maxFret);
    if (!frets) continue;
    const played = frets.filter((f) => f !== null);
    const span = Math.max(...played) - Math.min(...played);
    const low = Math.min(...played);
    if (!best || span < best.span || (span === best.span && low < best.low)) {
      best = { frets, span, low };
    }
  }
  return best ? best.frets : null;
}

// All three inversions of a triad on one string set.
export function getTriadShapes(rootPc, typeKey, setIndex) {
  return INVERSIONS.map((inv) => {
    const frets = buildTriad(rootPc, typeKey, setIndex, inv.key);
    if (!frets) return null;
    const played = frets.filter((f) => f !== null);
    return {
      frets,
      barre: null,
      barreFret: Math.min(...played),
      form: `triad-${STRING_SETS[setIndex].key}-${inv.key}`,
      label: inv.label,
      bass: inv.bass,
      isOpen: Math.min(...played) === 0,
      name: chordName(rootPc, typeKey),
      rootPc: mod12(rootPc),
      typeKey,
      notes: shapeNotes(frets, rootPc),
    };
  }).filter(Boolean);
}

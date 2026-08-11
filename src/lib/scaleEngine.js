import { noteAt, intervalFrom, mod12 } from './notes';

// Scale definitions. `intervals` are semitones from the root.
export const SCALES = {
  major: {
    key: 'major',
    label: 'Major',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    formula: ['1', '2', '3', '4', '5', '6', '7'],
  },
  naturalMinor: {
    key: 'naturalMinor',
    label: 'Natural Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    formula: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
  },
  majorPentatonic: {
    key: 'majorPentatonic',
    label: 'Major Pentatonic',
    intervals: [0, 2, 4, 7, 9],
    formula: ['1', '2', '3', '5', '6'],
  },
  minorPentatonic: {
    key: 'minorPentatonic',
    label: 'Minor Pentatonic',
    intervals: [0, 3, 5, 7, 10],
    formula: ['1', 'b3', '4', '5', 'b7'],
  },
  blues: {
    key: 'blues',
    label: 'Blues',
    intervals: [0, 3, 5, 6, 7, 10],
    formula: ['1', 'b3', '4', 'b5', '5', 'b7'],
  },
  harmonicMinor: {
    key: 'harmonicMinor',
    label: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    formula: ['1', '2', 'b3', '4', '5', 'b6', '7'],
  },
  dorian: {
    key: 'dorian',
    label: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    formula: ['1', '2', 'b3', '4', '5', '6', 'b7'],
  },
  mixolydian: {
    key: 'mixolydian',
    label: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    formula: ['1', '2', '3', '4', '5', '6', 'b7'],
  },
};

export const SCALE_LIST = Object.values(SCALES);

// The five scales that expose CAGED positions / boxes on the fretboard.
export const FRETBOARD_SCALE_KEYS = [
  'major',
  'naturalMinor',
  'majorPentatonic',
  'minorPentatonic',
  'blues',
];

const MAJOR_PENT = [0, 2, 4, 7, 9];
const MINOR_PENT = [0, 3, 5, 7, 10];

// Each scale's 5 positions are built on top of its matching pentatonic box.
const PENTATONIC_SKELETON = {
  major: MAJOR_PENT,
  mixolydian: MAJOR_PENT,
  majorPentatonic: MAJOR_PENT,
  naturalMinor: MINOR_PENT,
  dorian: MINOR_PENT,
  harmonicMinor: MINOR_PENT,
  minorPentatonic: MINOR_PENT,
  blues: MINOR_PENT,
};

export function getScale(scaleType) {
  return SCALES[scaleType] || SCALES.minorPentatonic;
}

function resolveTuning(tuning) {
  // accepts a full tuning object; falls back to standard if given something odd
  if (tuning && Array.isArray(tuning.openMidi)) return tuning;
  return { offsets: [4, 9, 2, 7, 11, 4], openMidi: [40, 45, 50, 55, 59, 64] };
}

// All notes of a scale across the whole neck. Correct for every key by
// construction: a fret is included iff its interval from the root is in the
// scale.
export function getScaleNotes(rootPc, scaleType, tuning, maxFret) {
  const t = resolveTuning(tuning);
  const set = new Set(getScale(scaleType).intervals);
  const out = [];
  for (let string = 0; string < 6; string++) {
    for (let fret = 0; fret <= maxFret; fret++) {
      const pc = noteAt(t.offsets[string], fret);
      const interval = intervalFrom(rootPc, pc);
      if (set.has(interval)) {
        out.push({ string, fret, pc, interval, isRoot: interval === 0 });
      }
    }
  }
  return out;
}

// Box shapes are built once at a safe reference fret, then transposed — building directly at a low root can go negative.
const REF_ANCHOR = 12;
const offsetCache = new Map();

function boxOffsets(skeleton, t, positionIndex, cacheKey) {
  const memo = `${cacheKey}:${positionIndex}`;
  if (offsetCache.has(memo)) return offsetCache.get(memo);

  const skelSet = new Set(skeleton);
  const lowOpenPc = mod12(t.openMidi[0]);
  const rootPc = mod12(t.openMidi[0] + REF_ANCHOR);
  const startPc = mod12(rootPc + skeleton[positionIndex]);
  let startFret = mod12(startPc - lowOpenPc);
  while (startFret < REF_ANCHOR) startFret += 12;
  const startMidi = t.openMidi[0] + startFret;

  // 12 consecutive skeleton notes ascending from the anchor, 2 per string
  const seq = [];
  let p = startMidi;
  while (seq.length < 12 && p < startMidi + 60) {
    if (skelSet.has(mod12(p - rootPc))) seq.push(p);
    p++;
  }
  if (seq.length < 12) return null;

  const frets = [];
  for (let s = 0; s < 6; s++) {
    for (let j = 0; j < 2; j++) frets.push(seq[s * 2 + j] - t.openMidi[s]);
  }

  // Per-string ranges, not one shared window — the B string sits a fret higher (major 3rd tuning, not a 4th).
  const perString = [];
  for (let s = 0; s < 6; s++) {
    const a = frets[s * 2];
    const b = frets[s * 2 + 1];
    perString.push({
      min: Math.min(a, b) - REF_ANCHOR,
      max: Math.max(a, b) - REF_ANCHOR,
    });
  }

  const result = {
    perString,
    start: Math.min(...frets) - REF_ANCHOR,
    end: Math.max(...frets) - REF_ANCHOR,
  };
  offsetCache.set(memo, result);
  return result;
}

// Pentatonics ARE the box exactly (no reach). Larger scales need 1 fret of reach for notes outside the skeleton.
function usesPerStringShape(scaleType) {
  return getScale(scaleType).intervals.length > 5;
}

// Per-string fret ranges for a position, transposed to the requested key.
export function getPositionRanges(rootPc, scaleType, tuning, positionIndex, maxFret) {
  const t = resolveTuning(tuning);
  const skeleton = PENTATONIC_SKELETON[scaleType] || MINOR_PENT;
  const offsets = boxOffsets(skeleton, t, positionIndex, `${t.openMidi.join(',')}|${skeleton.join(',')}`);
  if (!offsets) {
    return Array.from({ length: 6 }, () => ({ start: 0, end: Math.min(4, maxFret) }));
  }

  const perString = usesPerStringShape(scaleType);
  const reach = perString ? 1 : 0;
  const rootAnchorFret = mod12(rootPc - mod12(t.openMidi[0]));
  const clamp = (v) => Math.max(0, Math.min(maxFret, v));

  // shift the WHOLE position by an octave if needed, never just one string
  let shift = 0;
  if (rootAnchorFret + offsets.end + reach > maxFret) shift = -12;
  if (rootAnchorFret + offsets.start - reach + shift < 0) shift += 12;

  if (!perString) {
    const start = clamp(rootAnchorFret + offsets.start + shift);
    const end = clamp(rootAnchorFret + offsets.end + shift);
    return Array.from({ length: 6 }, () => ({ start, end }));
  }

  return offsets.perString.map((o) => ({
    start: clamp(rootAnchorFret + o.min - reach + shift),
    end: clamp(rootAnchorFret + o.max + reach + shift),
  }));
}

// Overall fret span of a position — used for the on-screen "Frets 5-8" hint.
export function getPositionWindow(rootPc, scaleType, tuning, positionIndex, maxFret) {
  const ranges = getPositionRanges(rootPc, scaleType, tuning, positionIndex, maxFret);
  return {
    start: Math.min(...ranges.map((r) => r.start)),
    end: Math.max(...ranges.map((r) => r.end)),
  };
}

// Notes of a scale limited to one position, filtered per string so the shape
// keeps its real outline instead of being squared off to a single window.
export function getScaleNotesInPosition(rootPc, scaleType, tuning, positionIndex, maxFret) {
  const ranges = getPositionRanges(rootPc, scaleType, tuning, positionIndex, maxFret);
  return getScaleNotes(rootPc, scaleType, tuning, maxFret).filter((n) => {
    const r = ranges[n.string];
    return n.fret >= r.start && n.fret <= r.end;
  });
}

// The distinct pitch classes in a scale for a given key, in scale-degree order.
export function getScaleNoteList(rootPc, scaleType) {
  return getScale(scaleType).intervals.map((iv) => mod12(rootPc + iv));
}

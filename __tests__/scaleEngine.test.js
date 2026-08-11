import {
  SCALE_LIST,
  getScaleNotes,
  getScaleNotesInPosition,
  getPositionWindow,
} from '../src/lib/scaleEngine';
import { TUNINGS, pcName } from '../src/lib/notes';

const STD = TUNINGS.standard;
const A = 9;
const E = 4;
const G = 7;

// per-string fret lists, low E first
function shape(root, scaleKey, position, maxFret = 18) {
  const byString = [[], [], [], [], [], []];
  getScaleNotesInPosition(root, scaleKey, STD, position, maxFret).forEach((n) =>
    byString[n.string].push(n.fret)
  );
  byString.forEach((a) => a.sort((x, y) => x - y));
  return byString;
}

const stringOf = (root, scaleKey, position, string) => shape(root, scaleKey, position)[string];

describe('canonical shapes', () => {
  // The five A minor pentatonic boxes as every player memorises them.
  test.each([
    [0, [[5, 8], [5, 7], [5, 7], [5, 7], [5, 8], [5, 8]]],
    [1, [[8, 10], [7, 10], [7, 10], [7, 9], [8, 10], [8, 10]]],
    [2, [[10, 12], [10, 12], [10, 12], [9, 12], [10, 13], [10, 12]]],
    [3, [[12, 15], [12, 15], [12, 14], [12, 14], [13, 15], [12, 15]]],
    [4, [[15, 17], [15, 17], [14, 17], [14, 17], [15, 17], [15, 17]]],
  ])('A minor pentatonic box %i', (position, expected) => {
    expect(shape(A, 'minorPentatonic', position)).toEqual(expected);
  });

  test('E minor pentatonic box 1 sits in open position', () => {
    expect(shape(E, 'minorPentatonic', 0)).toEqual([[0, 3], [0, 2], [0, 2], [0, 2], [0, 3], [0, 3]]);
  });

  test('G major position 1 is the standard 2nd-position shape', () => {
    expect(shape(G, 'major', 0)).toEqual([[2, 3, 5], [2, 3, 5], [2, 4, 5], [2, 4, 5], [3, 5], [2, 3, 5]]);
  });

  // The pentatonic box plus every b5 within reach — the b5s sit a fret under
  // the 5th or a fret above the 4th, which is what makes them blue notes.
  test('A blues box 1 is the pentatonic box plus its blue notes', () => {
    expect(shape(A, 'blues', 0)).toEqual([[5, 8], [5, 6, 7], [5, 7], [5, 7, 8], [4, 5, 8], [5, 8]]);
  });

  test('A blues box 2 is the pentatonic box plus its blue notes', () => {
    expect(shape(A, 'blues', 1)).toEqual([
      [8, 10, 11], [6, 7, 10], [7, 10], [7, 8, 9], [8, 10], [8, 10, 11],
    ]);
  });
});

// Every one of these was spotted on a real fretboard and was a genuine bug.
// They are the highest-value tests in the file.
describe('regressions reported from playing the app', () => {
  test('A natural minor P1 includes the B at fret 4 on the G string', () => {
    expect(stringOf(A, 'naturalMinor', 0, 3)).toContain(4);
  });

  test('A natural minor P5 includes the F at fret 18 on the B string', () => {
    expect(stringOf(A, 'naturalMinor', 4, 4)).toContain(18);
  });

  test('A major P4 includes the D at fret 15 on the B string', () => {
    expect(stringOf(A, 'major', 3, 4)).toContain(15);
  });

  test('A major P5 includes the G# at fret 13 on the G string', () => {
    expect(stringOf(A, 'major', 4, 3)).toContain(13);
  });

  test('A blues keeps the b5 that belongs to each box', () => {
    expect(stringOf(A, 'blues', 1, 1)).toContain(6); // P2, A string
    expect(stringOf(A, 'blues', 1, 5)).toContain(11); // P2, high e
    expect(stringOf(A, 'blues', 3, 5)).toContain(11); // P4, high e
    expect(stringOf(A, 'blues', 4, 2)).toContain(13); // P5, D string
  });

  test('both E strings always show identical shapes (same note, two octaves apart)', () => {
    for (let root = 0; root < 12; root++) {
      for (const key of ['major', 'naturalMinor', 'minorPentatonic']) {
        for (let p = 0; p < 5; p++) {
          const s = shape(root, key, p);
          expect(s[0]).toEqual(s[5]);
        }
      }
    }
  });
});

describe('invariants across every key and scale', () => {
  test('every note shown belongs to the scale', () => {
    for (let root = 0; root < 12; root++) {
      for (const scale of SCALE_LIST) {
        const allowed = new Set(scale.intervals);
        for (let p = 0; p < 5; p++) {
          for (const n of getScaleNotesInPosition(root, scale.key, STD, p, 18)) {
            expect(allowed.has(n.interval)).toBe(true);
          }
        }
      }
    }
  });

  test.each([15, 18, 22])('every position fits a %i-fret neck', (maxFret) => {
    for (let root = 0; root < 12; root++) {
      for (const scale of SCALE_LIST) {
        for (let p = 0; p < 5; p++) {
          const w = getPositionWindow(root, scale.key, STD, p, maxFret);
          expect(w.start).toBeGreaterThanOrEqual(0);
          expect(w.end).toBeLessThanOrEqual(maxFret);
        }
      }
    }
  });

  test('every position contains a root note to orient from', () => {
    for (let root = 0; root < 12; root++) {
      for (const key of ['major', 'naturalMinor', 'majorPentatonic', 'minorPentatonic', 'blues']) {
        for (let p = 0; p < 5; p++) {
          const notes = getScaleNotesInPosition(root, key, STD, p, 18);
          expect(notes.some((n) => n.isRoot)).toBe(true);
        }
      }
    }
  });

  test('pentatonic boxes are exactly twelve notes, two per string', () => {
    for (let root = 0; root < 12; root++) {
      for (const key of ['minorPentatonic', 'majorPentatonic']) {
        for (let p = 0; p < 5; p++) {
          expect(getScaleNotesInPosition(root, key, STD, p, 22)).toHaveLength(12);
        }
      }
    }
  });

  test('seven-note positions contain all seven degrees', () => {
    for (let root = 0; root < 12; root++) {
      for (const key of ['major', 'naturalMinor']) {
        const wanted = SCALE_LIST.find((s) => s.key === key).intervals;
        for (let p = 0; p < 5; p++) {
          const got = new Set(getScaleNotesInPosition(root, key, STD, p, 22).map((n) => n.interval));
          wanted.forEach((iv) => expect(got.has(iv)).toBe(true));
        }
      }
    }
  });

  test('every blues box contains a b5', () => {
    for (let root = 0; root < 12; root++) {
      for (let p = 0; p < 5; p++) {
        const notes = getScaleNotesInPosition(root, 'blues', STD, p, 22);
        expect(notes.some((n) => n.interval === 6)).toBe(true);
      }
    }
  });

  // The point of storing shapes rather than fret numbers: a position must be
  // the same physical shape in every key, just moved along the neck.
  test('each position is the identical shape in all twelve keys', () => {
    for (const key of ['minorPentatonic', 'majorPentatonic', 'major', 'naturalMinor', 'blues']) {
      for (let p = 0; p < 5; p++) {
        let reference = null;
        for (let root = 0; root < 12; root++) {
          const w = getPositionWindow(root, key, STD, p, 22);
          const relative = [[], [], [], [], [], []];
          getScaleNotesInPosition(root, key, STD, p, 22).forEach((n) =>
            relative[n.string].push(n.fret - w.start)
          );
          relative.forEach((a) => a.sort((x, y) => x - y));
          if (reference === null) reference = relative;
          else expect({ key, p, root: pcName(root), relative }).toEqual({ key, p, root: pcName(root), relative: reference });
        }
      }
    }
  });

  test('harmonic minor never sounds a b7 alongside its raised 7th', () => {
    for (let root = 0; root < 12; root++) {
      for (let p = 0; p < 5; p++) {
        const notes = getScaleNotesInPosition(root, 'harmonicMinor', STD, p, 18);
        expect(notes.some((n) => n.interval === 10)).toBe(false);
        expect(notes.some((n) => n.interval === 11)).toBe(true);
      }
    }
  });

  test('the full-neck view only ever shows scale tones', () => {
    for (let root = 0; root < 12; root++) {
      for (const scale of SCALE_LIST) {
        const allowed = new Set(scale.intervals);
        for (const n of getScaleNotes(root, scale.key, STD, 22)) {
          expect(allowed.has(n.interval)).toBe(true);
        }
      }
    }
  });
});

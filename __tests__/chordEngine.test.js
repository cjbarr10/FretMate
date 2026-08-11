import {
  CHORD_TYPES,
  CHORD_TYPE_LIST,
  TRIAD_QUALITIES,
  STRING_SETS,
  INVERSIONS,
  getChordShapes,
  getTriadShapes,
  shapeIntervals,
  chordName,
  toFretboardNotes,
} from '../src/lib/chordEngine';
import { mod12 } from '../src/lib/notes';

// chord order is high-e-first; reverse to read it like standard tab
const tab = (s) => [...s.frets].reverse().map((f) => (f === null ? 'x' : f)).join('-');
const formOf = (root, type, form) => getChordShapes(root, type).find((s) => s.form === form);

// open pitch classes, low E first
const OPEN_PC = [4, 9, 2, 7, 11, 4];
// open MIDI pitches in chord order (0 = high e)
const OPEN_MIDI = [64, 59, 55, 50, 45, 40];

describe('open chords', () => {
  // Each open chord is really a CAGED form with its barre at fret 0.
  test.each([
    [0, 'major', 'cForm', 'x-3-2-0-1-0', 'C'],
    [7, 'major', 'gForm', '3-2-0-0-0-3', 'G'],
    [2, 'major', 'dForm', 'x-x-0-2-3-2', 'D'],
    [9, 'major', 'aForm', 'x-0-2-2-2-0', 'A'],
    [4, 'major', 'eForm', '0-2-2-1-0-0', 'E'],
    [9, 'minor', 'aForm', 'x-0-2-2-1-0', 'Am'],
    [4, 'minor', 'eForm', '0-2-2-0-0-0', 'Em'],
    [2, 'minor', 'dForm', 'x-x-0-2-3-1', 'Dm'],
    [9, 'dom7', 'aForm', 'x-0-2-0-2-0', 'A7'],
    [7, 'dom7', 'gForm', '3-2-0-0-0-1', 'G7'],
    [0, 'dom7', 'cForm', 'x-3-2-3-1-0', 'C7'],
    [0, 'maj7', 'cForm', 'x-3-2-0-0-0', 'Cmaj7'],
    [2, 'maj7', 'dForm', 'x-x-0-2-2-2', 'Dmaj7'],
    [2, 'min7', 'dForm', 'x-x-0-2-1-1', 'Dm7'],
    [2, 'sus4', 'dForm', 'x-x-0-2-3-3', 'Dsus4'],
    [2, 'sus2', 'dForm', 'x-x-0-2-3-0', 'Dsus2'],
  ])('%s open chord (%s)', (root, type, form, expected) => {
    expect(tab(formOf(root, type, form))).toBe(expected);
  });
});

describe('movable barre shapes', () => {
  test.each([
    [5, 'major', 'eForm', '1-3-3-2-1-1', 'F'],
    [11, 'major', 'aForm', 'x-2-4-4-4-2', 'B'],
    [5, 'minor', 'eForm', '1-3-3-1-1-1', 'Fm'],
    [11, 'minor', 'aForm', 'x-2-4-4-3-2', 'Bm'],
    [5, 'dom7', 'eForm', '1-3-1-2-1-1', 'F7'],
    [11, 'dom7', 'aForm', 'x-2-4-2-4-2', 'B7'],
    [5, 'maj7', 'eForm', '1-3-2-2-1-1', 'Fmaj7'],
    [5, 'min7', 'eForm', '1-3-1-1-1-1', 'Fm7'],
    [11, 'min7', 'aForm', 'x-2-4-2-3-2', 'Bm7'],
    [2, 'major', 'cForm', 'x-5-4-2-3-2', 'D C-form'],
    [9, 'major', 'gForm', '5-4-2-2-2-5', 'A G-form'],
    [4, 'major', 'dForm', 'x-x-2-4-5-4', 'E D-form'],
    [5, 'power5', 'eForm', '1-3-3-x-x-x', 'F5'],
    [11, 'power5', 'aForm', 'x-2-4-4-x-x', 'B5'],
    [2, 'dim7', 'dForm', 'x-x-0-1-0-1', 'Ddim7'],
    [11, 'm7b5', 'aForm', 'x-2-3-2-3-x', 'Bm7b5'],
    [2, 'maj6', 'dForm', 'x-x-0-2-0-2', 'D6'],
    [2, 'min6', 'dForm', 'x-x-0-2-0-1', 'Dm6'],
  ])('%s %s %s', (root, type, form, expected) => {
    expect(tab(formOf(root, type, form))).toBe(expected);
  });
});

describe('every voicing in every key', () => {
  const allShapes = [];
  for (let root = 0; root < 12; root++) {
    for (const type of CHORD_TYPE_LIST) {
      for (const s of getChordShapes(root, type.key)) allShapes.push({ root, type, s });
    }
  }

  test('sounds exactly the chord it claims to be', () => {
    for (const { root, type, s } of allShapes) {
      const got = shapeIntervals(s.frets, root);
      const want = [...type.intervals].sort((a, b) => a - b);
      // extra tones are always a bug
      expect(got.filter((i) => !want.includes(i))).toEqual([]);
      // a missing 5th is normal voicing practice in four-note chords;
      // anything else missing is a bug
      expect(want.filter((i) => !got.includes(i) && i !== 7)).toEqual([]);
    }
  });

  test('puts the root in the bass', () => {
    for (const { root, type, s } of allShapes) {
      const lowFirst = [...s.frets].reverse();
      const i = lowFirst.findIndex((f) => f !== null);
      expect({
        chord: chordName(root, type.key),
        bass: mod12(OPEN_PC[i] + lowFirst[i]),
      }).toEqual({ chord: chordName(root, type.key), bass: mod12(root) });
    }
  });

  // Muting the low or high strings is normal (power chords, A-form, D-form).
  // A mute BETWEEN two played strings is not playable.
  test('never strands a muted string between two played ones', () => {
    for (const { s } of allShapes) {
      const lowFirst = [...s.frets].reverse();
      const first = lowFirst.findIndex((f) => f !== null);
      const last = lowFirst.length - 1 - [...lowFirst].reverse().findIndex((f) => f !== null);
      expect(lowFirst.slice(first, last + 1).some((f) => f === null)).toBe(false);
    }
  });

  test('stays within a five-fret reach and on the neck', () => {
    for (const { s } of allShapes) {
      const fretted = s.frets.filter((f) => f !== null && f > 0);
      s.frets.forEach((f) => f !== null && expect(f).toBeGreaterThanOrEqual(0));
      if (fretted.length) {
        expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThanOrEqual(4);
        expect(Math.max(...fretted)).toBeLessThanOrEqual(15);
      }
    }
  });

  test('never frets a note below its own barre', () => {
    for (const { s } of allShapes) {
      if (!s.barre) continue;
      const fretted = s.frets.filter((f) => f !== null && f > 0);
      if (fretted.length) expect(Math.min(...fretted)).toBeGreaterThanOrEqual(s.barre.fret);
    }
  });

  test('voicings climb the neck in order', () => {
    for (let root = 0; root < 12; root++) {
      for (const type of CHORD_TYPE_LIST) {
        const frets = getChordShapes(root, type.key).map((s) => s.barreFret);
        expect(frets).toEqual([...frets].sort((a, b) => a - b));
      }
    }
  });

  // C major should walk C-A-G-E-D up the neck; that IS the CAGED system.
  test('C major produces the CAGED sequence', () => {
    expect(getChordShapes(0, 'major').map((s) => s.label)).toEqual([
      'C-Form', 'A-Form', 'G-Form', 'E-Form', 'D-Form',
    ]);
  });
});

describe('triads', () => {
  test('C major on the top string set, all three inversions', () => {
    const shapes = getTriadShapes(0, 'major', 3);
    expect(shapes.map(tab)).toEqual(['x-x-x-5-5-3', 'x-x-x-9-8-8', 'x-x-x-0-1-0']);
  });

  test('A major root position on the bottom string set', () => {
    expect(tab(getTriadShapes(9, 'major', 0)[0])).toBe('5-4-2-x-x-x');
  });

  test('576 voicings: right tones, right bass, ascending, compact', () => {
    let count = 0;
    for (let root = 0; root < 12; root++) {
      for (const quality of TRIAD_QUALITIES) {
        for (let set = 0; set < STRING_SETS.length; set++) {
          const shapes = getTriadShapes(root, quality, set);
          expect(shapes).toHaveLength(3);
          shapes.forEach((s, inv) => {
            count += 1;
            // exactly the three chord tones
            expect(shapeIntervals(s.frets, root)).toEqual(
              [...CHORD_TYPES[quality].intervals].sort((a, b) => a - b)
            );
            // only the three strings of the set are played
            const played = s.frets.map((f, i) => (f === null ? null : i)).filter((i) => i !== null);
            expect(played.sort((a, b) => a - b)).toEqual(
              [...STRING_SETS[set].strings].sort((a, b) => a - b)
            );
            // the inversion's tone is in the bass
            const strings = STRING_SETS[set].strings;
            const bassPc = mod12(OPEN_MIDI[strings[0]] + s.frets[strings[0]]);
            expect(mod12(bassPc - root)).toBe(CHORD_TYPES[quality].intervals[INVERSIONS[inv].key]);
            // notes ascend in pitch across the set — that's what "close voiced" means
            let prev = -1;
            for (const st of strings) {
              const pitch = OPEN_MIDI[st] + s.frets[st];
              expect(pitch).toBeGreaterThan(prev);
              prev = pitch;
            }
            // a triad you can't reach isn't a triad you can use
            const fr = s.frets.filter((f) => f !== null);
            expect(Math.max(...fr) - Math.min(...fr)).toBeLessThanOrEqual(4);
          });
        }
      }
    }
    expect(count).toBe(576);
  });
});

describe('crossing between chord and fretboard string numbering', () => {
  // chord shapes count 0 = high e; the fretboard counts 0 = low E
  test('toFretboardNotes flips the string order without changing the notes', () => {
    const shape = getChordShapes(0, 'major')[0]; // open C
    const converted = toFretboardNotes(shape);
    converted.forEach((n) => {
      const chordIndex = 5 - n.string;
      expect(shape.frets[chordIndex]).toBe(n.fret);
      expect(shape.notes[chordIndex].pc).toBe(n.pc);
    });
    expect(converted).toHaveLength(shape.frets.filter((f) => f !== null).length);
  });
});

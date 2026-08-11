import { getDiatonicChords, supportsDiatonicChords } from '../src/lib/harmony';
import { CHORD_TYPES, getChordShapes } from '../src/lib/chordEngine';
import {
  autoCorrelate,
  freqToNote,
  centsFromTarget,
  matchToTuning,
  smoothPitch,
  downsampleAverage,
  rmsOf,
} from '../src/lib/pitchDetection';
import { noteOctaveToFreq, midiToFreq, TUNER_PRESETS } from '../src/lib/notes';
import { beatIntervalMs } from '../src/lib/tempo';
import { parseWavBytes } from '../src/lib/wav';
import { base64ToBytes } from '../src/lib/base64';

const names = (root, scale, sevenths) =>
  getDiatonicChords(root, scale, sevenths).map((c) => c.name).join(' ');

describe('chords in a key', () => {
  test('C major triads', () => {
    expect(names(0, 'major', false)).toBe('C Dm Em F G Am Bdim');
  });

  test('C major sevenths', () => {
    expect(names(0, 'major', true)).toBe('Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7b5');
  });

  test('C major roman numerals', () => {
    expect(getDiatonicChords(0, 'major', false).map((c) => c.roman).join(' ')).toBe(
      'I ii iii IV V vi vii\u00B0'
    );
  });

  test('A natural minor triads', () => {
    expect(names(9, 'naturalMinor', false)).toBe('Am Bdim C Dm Em F G');
  });

  test('D dorian and G mixolydian', () => {
    expect(names(2, 'dorian', false)).toBe('Dm Em F G Am Bdim C');
    expect(names(7, 'mixolydian', false)).toBe('G Am Bdim C Dm Em F');
  });

  // The whole reason harmonic minor exists is the major V chord.
  test('A harmonic minor gives a major V and an augmented III', () => {
    expect(names(9, 'harmonicMinor', false)).toBe('Am Bdim Caug Dm E F G#dim');
    const chords = getDiatonicChords(9, 'harmonicMinor', false);
    expect(chords[4].typeKey).toBe('major');
    expect(chords[2].typeKey).toBe('aug');
  });

  test('harmonic minor sevenths that cannot be voiced are flagged, not mislabelled', () => {
    const chords = getDiatonicChords(9, 'harmonicMinor', true);
    expect(chords[0].approximated).toBe('minor/maj7');
    expect(chords[2].approximated).toBe('aug/maj7');
    expect(chords[6].typeKey).toBe('dim7');
  });

  test('five- and six-note scales have no diatonic harmony', () => {
    expect(supportsDiatonicChords('minorPentatonic')).toBe(false);
    expect(supportsDiatonicChords('blues')).toBe(false);
    expect(supportsDiatonicChords('major')).toBe(true);
  });

  test('every key chord is playable — tapping one can never dead-end', () => {
    for (let root = 0; root < 12; root++) {
      for (const scale of ['major', 'naturalMinor', 'harmonicMinor', 'dorian', 'mixolydian']) {
        for (const sevenths of [false, true]) {
          const chords = getDiatonicChords(root, scale, sevenths);
          expect(chords).toHaveLength(7);
          expect(chords[0].rootPc).toBe(root); // degree 1 is the key itself
          chords.forEach((ch) => {
            expect(CHORD_TYPES[ch.typeKey]).toBeDefined();
            expect(getChordShapes(ch.rootPc, ch.typeKey).length).toBeGreaterThan(0);
          });
        }
      }
    }
  });
});

function tone(freq, sampleRate, seconds, amplitude = 0.8) {
  const n = Math.floor(sampleRate * seconds);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return buf;
}
const cents = (detected, actual) => 1200 * Math.log2(detected / actual);

describe('pitch detection', () => {
  // the six open strings, through the same path the tuner uses
  test.each(Object.entries({ E2: 82.41, A2: 110.0, D3: 146.83, G3: 196.0, B3: 246.94, E4: 329.63 }))(
    'detects %s within 5 cents',
    (label, freq) => {
      const raw = tone(freq, 44100, 0.2);
      const detected = autoCorrelate(downsampleAverage(raw, 4), 44100 / 4);
      expect(Math.abs(cents(detected, freq))).toBeLessThan(5);
    }
  );

  test('reports nothing rather than guessing on silence', () => {
    expect(autoCorrelate(new Float32Array(4410), 44100)).toBe(-1);
  });

  test('reports nothing when the signal is too quiet to trust', () => {
    const quiet = tone(200, 44100, 0.2, 0.004);
    expect(autoCorrelate(quiet, 44100)).toBe(-1);
  });

  test('freqToNote maps frequencies to names and cents', () => {
    expect(freqToNote(440)).toMatchObject({ name: 'A', octave: 4, cents: 0 });
    expect(freqToNote(82.41)).toMatchObject({ name: 'E', octave: 2 });
    expect(freqToNote(445).cents).toBeGreaterThan(0); // sharp
    expect(freqToNote(435).cents).toBeLessThan(0); // flat
    expect(freqToNote(0)).toBeNull();
    expect(freqToNote(-5)).toBeNull();
  });

  test('centsFromTarget measures distance from a specific string', () => {
    expect(centsFromTarget(440, 440)).toBe(0);
    expect(centsFromTarget(880, 440)).toBe(1200);
  });

  // A doubled low string used to be matched to a completely unrelated string,
  // which is what made the bottom three strings read as the top three.
  test('a harmonic-doubled reading still resolves to the right pitch', () => {
    const targets = TUNER_PRESETS.standard.notes.map((n) => noteOctaveToFreq(n, 440));
    targets.forEach((freq, i) => {
      // an undistorted reading matches its own string exactly
      expect(matchToTuning(freq, targets)).toMatchObject({ index: i, cents: 0 });
      // The two E strings are two octaves apart, so a folded reading can
      // legitimately land on either one. What must hold is that the corrected
      // pitch is right — the needle can't be pointing at a wrong note.
      expect(Math.abs(matchToTuning(freq * 2, targets).cents)).toBeLessThan(1);
      expect(Math.abs(matchToTuning(freq / 2, targets).cents)).toBeLessThan(1);
    });
  });

  test('a doubled low string is never matched to a different note', () => {
    const targets = TUNER_PRESETS.standard.notes.map((n) => noteOctaveToFreq(n, 440));
    // A2, D3, G3, B3 have no octave twin in standard tuning, so these must
    // resolve to their own string and nothing else.
    [1, 2, 3, 4].forEach((i) => {
      expect(matchToTuning(targets[i] * 2, targets).index).toBe(i);
      expect(matchToTuning(targets[i] / 2, targets).index).toBe(i);
    });
  });

  test('a genuinely flat reading is not reinterpreted as another string', () => {
    const targets = TUNER_PRESETS.standard.notes.map((n) => noteOctaveToFreq(n, 440));
    expect(matchToTuning(108, targets).index).toBe(1); // flat A2, not something else
  });

  test('smoothing folds octave errors back and holds a steady reading', () => {
    let history = [];
    let r = smoothPitch(history, 195.8);
    history = r.next;
    r = smoothPitch(history, 392.1); // octave-up error
    history = r.next;
    expect(Math.abs(cents(r.median, 196))).toBeLessThan(20);
    r = smoothPitch(history, 98.0); // octave-down error
    expect(Math.abs(cents(r.median, 196))).toBeLessThan(20);
    expect(r.next.length).toBeLessThanOrEqual(3);
  });

  test('downsampling keeps the pitch but cuts the work', () => {
    const raw = tone(196, 44100, 0.2);
    const small = downsampleAverage(raw, 4);
    expect(small).toHaveLength(raw.length / 4);
    expect(Math.abs(cents(autoCorrelate(small, 11025), 196))).toBeLessThan(5);
  });

  test('rmsOf measures level', () => {
    expect(rmsOf(new Float32Array(100))).toBe(0);
    expect(rmsOf(tone(200, 44100, 0.1, 0.8))).toBeCloseTo(0.8 / Math.SQRT2, 2);
  });
});

describe('audio decoding', () => {
  function wavBuffer(freq, sampleRate, seconds) {
    const n = Math.floor(sampleRate * seconds);
    const dataSize = n * 2;
    const buf = Buffer.alloc(44 + dataSize);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(sampleRate * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(dataSize, 40);
    for (let i = 0; i < n; i++) {
      buf.writeInt16LE(Math.round(0.7 * 32767 * Math.sin((2 * Math.PI * freq * i) / sampleRate)), 44 + i * 2);
    }
    return buf;
  }

  test('reads a recorded WAV and recovers the pitch from it', () => {
    const buf = wavBuffer(196, 44100, 0.2);
    const { samples, sampleRate } = parseWavBytes(new Uint8Array(buf));
    expect(sampleRate).toBe(44100);
    expect(samples).toHaveLength(44100 * 0.2);
    expect(Math.abs(cents(autoCorrelate(downsampleAverage(samples, 4), 11025), 196))).toBeLessThan(5);
  });

  test('rejects data that is not a WAV', () => {
    expect(() => parseWavBytes(new Uint8Array([1, 2, 3, 4]))).toThrow();
  });

  // Hermes has no atob, so the decoder is hand-rolled and must match exactly.
  test('base64 decoder matches a known-good implementation', () => {
    const buf = wavBuffer(196, 44100, 0.05);
    const b64 = buf.toString('base64');
    expect(Buffer.from(base64ToBytes(b64))).toEqual(buf);
  });
});

describe('tuning reference', () => {
  test('open strings land on their standard frequencies', () => {
    expect(noteOctaveToFreq('A4', 440)).toBeCloseTo(440, 5);
    expect(noteOctaveToFreq('E2', 440)).toBeCloseTo(82.41, 1);
    expect(noteOctaveToFreq('E4', 440)).toBeCloseTo(329.63, 1);
  });

  test('the A4 reference shifts every string with it', () => {
    expect(noteOctaveToFreq('A4', 442)).toBeCloseTo(442, 5);
    expect(midiToFreq(69, 442)).toBeCloseTo(442, 5);
  });
});

describe('metronome timing', () => {
  test('BPM means quarter notes', () => {
    expect(beatIntervalMs(120)).toBe(500);
    expect(beatIntervalMs(60)).toBe(1000);
    expect(beatIntervalMs(240)).toBe(250);
  });

  test('interval scales inversely with tempo across the range', () => {
    for (const bpm of [40, 60, 100, 140, 180, 240]) {
      expect(beatIntervalMs(bpm) * bpm).toBeCloseTo(60000, 6);
    }
  });
});

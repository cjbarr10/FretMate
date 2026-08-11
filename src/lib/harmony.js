import { mod12 } from './notes';
import { getScale } from './scaleEngine';
import { CHORD_TYPES, chordName } from './chordEngine';

// Diatonic chords, derived by stacking thirds through the scale (not hardcoded per key).

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// interval signature -> our chord type key
const TRIADS = {
  '4,7': 'major',
  '3,7': 'minor',
  '3,6': 'dim',
  '4,8': 'aug',
};

const SEVENTHS = {
  '4,7,11': 'maj7',
  '3,7,10': 'min7',
  '4,7,10': 'dom7',
  '3,6,10': 'm7b5',
  '3,6,9': 'dim7',
};

// Two harmonic-minor 7ths have no chord-engine equivalent; fall back to the triad and flag it.
const UNSUPPORTED_SEVENTHS = {
  '3,7,11': 'minor/maj7',
  '4,8,11': 'aug/maj7',
};

function romanFor(index, typeKey) {
  const base = ROMAN[index];
  if (typeKey === 'major' || typeKey === 'dom7' || typeKey === 'maj7') return base;
  if (typeKey === 'aug') return base + '+';
  if (typeKey === 'dim') return base.toLowerCase() + '\u00B0';
  if (typeKey === 'dim7') return base.toLowerCase() + '\u00B07';
  if (typeKey === 'm7b5') return base.toLowerCase() + '\u00F8';
  return base.toLowerCase(); // minor, min7
}

export function supportsDiatonicChords(scaleType) {
  return getScale(scaleType).intervals.length === 7;
}

// One entry per scale degree, in order.
// `useSevenths` swaps the triads for their four-note versions.
export function getDiatonicChords(rootPc, scaleType, useSevenths = false) {
  const scale = getScale(scaleType);
  const iv = scale.intervals;
  if (iv.length !== 7) return [];

  return iv.map((degreeInterval, i) => {
    const third = iv[(i + 2) % 7];
    const fifth = iv[(i + 4) % 7];
    const seventh = iv[(i + 6) % 7];

    const t3 = mod12(third - degreeInterval);
    const t5 = mod12(fifth - degreeInterval);
    const t7 = mod12(seventh - degreeInterval);

    const triadKey = TRIADS[`${t3},${t5}`] || 'major';
    const seventhSig = `${t3},${t5},${t7}`;
    const seventhKey = SEVENTHS[seventhSig];
    const unsupported = UNSUPPORTED_SEVENTHS[seventhSig];

    // fall back to the triad when the seventh has no engine equivalent
    const typeKey = useSevenths ? seventhKey || triadKey : triadKey;

    const chordRoot = mod12(rootPc + degreeInterval);
    return {
      degree: i + 1,
      rootPc: chordRoot,
      typeKey,
      name: chordName(chordRoot, typeKey),
      roman: romanFor(i, typeKey),
      // set when the true seventh here can't be represented, e.g. the
      // minor-major 7th on harmonic minor's i
      approximated: useSevenths && !seventhKey ? unsupported || null : null,
      intervals: CHORD_TYPES[typeKey].intervals,
    };
  });
}

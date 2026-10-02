// Diatonic chords, derived by stacking thirds through the scale rather than
// hardcoded per key — so harmonic minor and the modes come out right too.
(function (FM) {
  'use strict';

  var mod12 = FM.mod12;

  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  // interval signature -> our chord type key
  var TRIADS = {
    '4,7': 'major',
    '3,7': 'minor',
    '3,6': 'dim',
    '4,8': 'aug',
  };

  var SEVENTHS = {
    '4,7,11': 'maj7',
    '3,7,10': 'min7',
    '4,7,10': 'dom7',
    '3,6,10': 'm7b5',
    '3,6,9': 'dim7',
  };

  // Two harmonic-minor 7ths have no chord-engine equivalent; fall back to the
  // triad and flag it rather than quietly showing the wrong chord.
  var UNSUPPORTED_SEVENTHS = {
    '3,7,11': 'minor/maj7',
    '4,8,11': 'aug/maj7',
  };

  function romanFor(index, typeKey) {
    var base = ROMAN[index];
    if (typeKey === 'major' || typeKey === 'dom7' || typeKey === 'maj7') return base;
    if (typeKey === 'aug') return base + '+';
    if (typeKey === 'dim') return base.toLowerCase() + '°';
    if (typeKey === 'dim7') return base.toLowerCase() + '°7';
    if (typeKey === 'm7b5') return base.toLowerCase() + 'ø';
    return base.toLowerCase(); // minor, min7
  }

  // You can't stack thirds through a pentatonic and get meaningful chords.
  function supportsDiatonicChords(scaleType) {
    return FM.getScale(scaleType).intervals.length === 7;
  }

  // One entry per scale degree, in order. `useSevenths` swaps the triads for
  // their four-note versions.
  function getDiatonicChords(rootPc, scaleType, useSevenths) {
    var iv = FM.getScale(scaleType).intervals;
    if (iv.length !== 7) return [];

    return iv.map(function (degreeInterval, i) {
      var third = iv[(i + 2) % 7];
      var fifth = iv[(i + 4) % 7];
      var seventh = iv[(i + 6) % 7];

      var t3 = mod12(third - degreeInterval);
      var t5 = mod12(fifth - degreeInterval);
      var t7 = mod12(seventh - degreeInterval);

      var triadKey = TRIADS[t3 + ',' + t5] || 'major';
      var seventhSig = t3 + ',' + t5 + ',' + t7;
      var seventhKey = SEVENTHS[seventhSig];
      var unsupported = UNSUPPORTED_SEVENTHS[seventhSig];

      // fall back to the triad when the seventh has no engine equivalent
      var typeKey;
      if (useSevenths && seventhKey) {
        typeKey = seventhKey;
      } else {
        typeKey = triadKey;
      }

      // set when the true seventh here can't be represented, e.g. the
      // minor-major 7th on harmonic minor's i
      var approximated = null;
      if (useSevenths && !seventhKey && unsupported) {
        approximated = unsupported;
      }

      var chordRoot = mod12(rootPc + degreeInterval);
      return {
        degree: i + 1,
        rootPc: chordRoot,
        typeKey: typeKey,
        name: FM.chordName(chordRoot, typeKey),
        roman: romanFor(i, typeKey),
        approximated: approximated,
      };
    });
  }

  FM.supportsDiatonicChords = supportsDiatonicChords;
  FM.getDiatonicChords = getDiatonicChords;
})((window.FM = window.FM || {}));

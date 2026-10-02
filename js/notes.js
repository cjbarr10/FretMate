// Pitch classes, note names and tunings — the vocabulary every other module
// speaks. Nothing here knows about the DOM.
(function (FM) {
  'use strict';

  // Pitch classes: C = 0 ... B = 11
  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  // The 12 chromatic roots, in the order shown to the user.
  var ROOTS = NOTE_NAMES.map(function (name, pc) {
    return { name: name, pc: pc };
  });

  // offsets = open pitch classes (0 = low E .. 5 = high e), openMidi = absolute
  // pitch (needed for box shapes), names = display labels.
  var TUNINGS = {
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

  // JS's % keeps the sign of the dividend, which breaks every interval
  // calculation that walks backwards from a root.
  function mod12(n) {
    return ((n % 12) + 12) % 12;
  }

  function pcName(pc, useFlats) {
    var names;
    if (useFlats) {
      names = NOTE_NAMES_FLAT;
    } else {
      names = NOTE_NAMES;
    }
    return names[mod12(pc)];
  }

  // Pitch class sounding at a given fret on a string with a given open pitch class.
  function noteAt(openPc, fret) {
    return mod12(openPc + fret);
  }

  // Semitone interval (0..11) from a root pitch class to another pitch class.
  function intervalFrom(rootPc, pc) {
    return mod12(pc - rootPc);
  }

  FM.NOTE_NAMES = NOTE_NAMES;
  FM.NOTE_NAMES_FLAT = NOTE_NAMES_FLAT;
  FM.ROOTS = ROOTS;
  FM.TUNINGS = TUNINGS;
  FM.mod12 = mod12;
  FM.pcName = pcName;
  FM.noteAt = noteAt;
  FM.intervalFrom = intervalFrom;
})((window.FM = window.FM || {}));

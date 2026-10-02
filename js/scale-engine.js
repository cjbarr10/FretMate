// Scales on the neck. Every note is included because its interval from the root
// is in the scale — never because it was typed into a table — so all 12 keys
// come out right by construction.
(function (FM) {
  'use strict';

  var noteAt = FM.noteAt;
  var intervalFrom = FM.intervalFrom;
  var mod12 = FM.mod12;

  // `intervals` are semitones from the root.
  var SCALES = {
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

  var SCALE_LIST = Object.keys(SCALES).map(function (k) {
    return SCALES[k];
  });

  var MAJOR_PENT = [0, 2, 4, 7, 9];
  var MINOR_PENT = [0, 3, 5, 7, 10];

  // Each scale's 5 positions are built on top of its matching pentatonic box —
  // which is how the shapes are actually taught and remembered.
  var PENTATONIC_SKELETON = {
    major: MAJOR_PENT,
    mixolydian: MAJOR_PENT,
    majorPentatonic: MAJOR_PENT,
    naturalMinor: MINOR_PENT,
    dorian: MINOR_PENT,
    harmonicMinor: MINOR_PENT,
    minorPentatonic: MINOR_PENT,
    blues: MINOR_PENT,
  };

  function getScale(scaleType) {
    return SCALES[scaleType] || SCALES.minorPentatonic;
  }

  function resolveTuning(tuning) {
    // accepts a full tuning object; falls back to standard if given something odd
    if (tuning && Array.isArray(tuning.openMidi)) return tuning;
    return { offsets: [4, 9, 2, 7, 11, 4], openMidi: [40, 45, 50, 55, 59, 64] };
  }

  // All notes of a scale across the whole neck.
  function getScaleNotes(rootPc, scaleType, tuning, maxFret) {
    var t = resolveTuning(tuning);
    var set = getScale(scaleType).intervals;
    var out = [];
    for (var string = 0; string < 6; string++) {
      for (var fret = 0; fret <= maxFret; fret++) {
        // what note is on this string and fret
        var pc = noteAt(t.offsets[string], fret);
        // how far it is from the root
        var interval = intervalFrom(rootPc, pc);
        if (set.indexOf(interval) !== -1) {
          out.push({ string: string, fret: fret, pc: pc, interval: interval, isRoot: interval === 0 });
        }
      }
    }
    return out;
  }

  // Box shapes are built once at a safe reference fret, then transposed —
  // building directly at a low root can go negative.
  var REF_ANCHOR = 12;
  var offsetCache = {};

  function boxOffsets(skeleton, t, positionIndex, cacheKey) {
    var memo = cacheKey + ':' + positionIndex;
    // only runs if the calculation hasn't been done before
    if (Object.prototype.hasOwnProperty.call(offsetCache, memo)) return offsetCache[memo];

    var lowOpenPc = mod12(t.openMidi[0]);
    var rootPc = mod12(t.openMidi[0] + REF_ANCHOR);
    var startPc = mod12(rootPc + skeleton[positionIndex]);
    var startFret = mod12(startPc - lowOpenPc);
    // walk up until the shape is clear of the nut
    while (startFret < REF_ANCHOR) startFret += 12;
    var startMidi = t.openMidi[0] + startFret;

    // 12 consecutive skeleton notes ascending from the anchor, 2 per string
    var seq = [];
    var p = startMidi;
    while (seq.length < 12 && p < startMidi + 60) {
      if (skeleton.indexOf(mod12(p - rootPc)) !== -1) seq.push(p);
      p++;
    }
    if (seq.length < 12) return null;

    var frets = [];
    for (var s = 0; s < 6; s++) {
      for (var j = 0; j < 2; j++) frets.push(seq[s * 2 + j] - t.openMidi[s]);
    }

    // Per-string ranges, not one shared window — the B string sits a fret higher
    // (major 3rd tuning, not a 4th), so a square window would clip the shape.
    var perString = [];
    for (var k = 0; k < 6; k++) {
      var a = frets[k * 2];
      var b = frets[k * 2 + 1];
      perString.push({
        min: Math.min(a, b) - REF_ANCHOR,
        max: Math.max(a, b) - REF_ANCHOR,
      });
    }

    var result = {
      perString: perString,
      start: Math.min.apply(null, frets) - REF_ANCHOR,
      end: Math.max.apply(null, frets) - REF_ANCHOR,
    };
    offsetCache[memo] = result;
    return result;
  }

  // Pentatonics ARE the box exactly (no reach). Larger scales need 1 fret of
  // reach for the notes that sit outside the skeleton.
  function usesPerStringShape(scaleType) {
    return getScale(scaleType).intervals.length > 5;
  }

  // Per-string fret ranges for a position, transposed to the requested key.
  function getPositionRanges(rootPc, scaleType, tuning, positionIndex, maxFret) {
    var t = resolveTuning(tuning);
    var skeleton = PENTATONIC_SKELETON[scaleType] || MINOR_PENT;
    var offsets = boxOffsets(
      skeleton,
      t,
      positionIndex,
      t.openMidi.join(',') + '|' + skeleton.join(',')
    );

    function clamp(v) {
      return Math.max(0, Math.min(maxFret, v));
    }

    if (!offsets) {
      return [0, 1, 2, 3, 4, 5].map(function () {
        return { start: 0, end: Math.min(4, maxFret) };
      });
    }

    var perString = usesPerStringShape(scaleType);
    var reach;
    if (perString) {
      reach = 1;
    } else {
      reach = 0;
    }
    var rootAnchorFret = mod12(rootPc - mod12(t.openMidi[0]));

    // shift the WHOLE position by an octave if needed, never just one string
    var shift = 0;
    if (rootAnchorFret + offsets.end + reach > maxFret) shift = -12;
    if (rootAnchorFret + offsets.start - reach + shift < 0) shift += 12;

    if (!perString) {
      var start = clamp(rootAnchorFret + offsets.start + shift);
      var end = clamp(rootAnchorFret + offsets.end + shift);
      return [0, 1, 2, 3, 4, 5].map(function () {
        return { start: start, end: end };
      });
    }

    return offsets.perString.map(function (o) {
      return {
        start: clamp(rootAnchorFret + o.min - reach + shift),
        end: clamp(rootAnchorFret + o.max + reach + shift),
      };
    });
  }

  // Overall fret span of a position — used for the on-screen "Frets 5–8" hint.
  function getPositionWindow(rootPc, scaleType, tuning, positionIndex, maxFret) {
    var ranges = getPositionRanges(rootPc, scaleType, tuning, positionIndex, maxFret);
    var starts = ranges.map(function (r) {
      return r.start;
    });
    var ends = ranges.map(function (r) {
      return r.end;
    });
    return { start: Math.min.apply(null, starts), end: Math.max.apply(null, ends) };
  }

  // Notes of a scale limited to one position, filtered per string so the shape
  // keeps its real outline instead of being squared off to a single window.
  function getScaleNotesInPosition(rootPc, scaleType, tuning, positionIndex, maxFret) {
    var ranges = getPositionRanges(rootPc, scaleType, tuning, positionIndex, maxFret);
    return getScaleNotes(rootPc, scaleType, tuning, maxFret).filter(function (n) {
      var r = ranges[n.string];
      return n.fret >= r.start && n.fret <= r.end;
    });
  }

  // The distinct pitch classes in a scale for a given key, in scale-degree order.
  function getScaleNoteList(rootPc, scaleType) {
    return getScale(scaleType).intervals.map(function (iv) {
      return mod12(rootPc + iv);
    });
  }

  FM.SCALES = SCALES;
  FM.SCALE_LIST = SCALE_LIST;
  FM.getScale = getScale;
  FM.getScaleNotes = getScaleNotes;
  FM.getScaleNotesInPosition = getScaleNotesInPosition;
  FM.getPositionWindow = getPositionWindow;
  FM.getScaleNoteList = getScaleNoteList;
})((window.FM = window.FM || {}));

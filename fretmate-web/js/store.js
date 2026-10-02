// App state in one place, saved to localStorage.
//
// localStorage is deliberate: its get/set are synchronous, so state is restored
// before the first render and there is no hydration gap to design around.
(function (FM) {
  'use strict';

  var PREFIX = 'fretmate:';
  var VERSION = 1; // bump to invalidate saved state when a slice's shape changes

  // Only these keys are written per slice — running values like isPlaying would
  // reopen the app mid-click.
  var PERSISTED = {
    chords: ['root', 'chordType', 'viewMode', 'stringSet', 'shapeIndex'],
    scales: ['root', 'scaleType', 'position'],
    settings: ['frets', 'tuning', 'themeMode'],
    practice: ['bpm', 'beatsPerMeasure', 'accentFirst'],
  };

  var state = {
    chords: {
      root: 0, // pitch class, default C
      chordType: 'major',
      viewMode: 'caged', // 'caged' (barre voicings) | 'triads' (3-string shapes)
      stringSet: 3, // index into STRING_SETS — defaults to the top set, G–B–e
      shapeIndex: 0, // which voicing: a CAGED form, or an inversion in triad mode
    },
    scales: {
      root: 0,
      scaleType: 'minorPentatonic',
      position: 'all', // 'all' | 0..4
    },
    settings: {
      frets: 18, // 15 | 18 | 22
      tuning: 'standard',
      themeMode: 'dark',
    },
    practice: {
      bpm: 100,
      beatsPerMeasure: 4,
      accentFirst: true,
      isPlaying: false, // not persisted
    },
  };

  var listeners = [];

  function read(slice) {
    var raw;
    try {
      raw = window.localStorage.getItem(PREFIX + slice);
    } catch (err) {
      return null; // private mode, or storage disabled — defaults are fine
    }
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== VERSION) return null;
      return parsed.data;
    } catch (err) {
      return null; // corrupt entry; fall back to defaults rather than crash
    }
  }

  function write(slice) {
    var data = {};
    PERSISTED[slice].forEach(function (key) {
      data[key] = state[slice][key];
    });
    try {
      window.localStorage.setItem(PREFIX + slice, JSON.stringify({ version: VERSION, data: data }));
    } catch (err) {
      // out of quota or blocked — the app still works, it just won't remember
    }
  }

  // Triads only exist for the four three-note qualities, so a saved pairing of
  // triad mode with, say, maj7 would restore into a chord that has no shapes at
  // all. Repair the pair on the way in.
  function repairChords(chords) {
    if (chords.viewMode === 'triads' && !FM.isTriadQuality(chords.chordType)) {
      chords.viewMode = 'caged';
    }
    return chords;
  }

  function load() {
    Object.keys(PERSISTED).forEach(function (slice) {
      var saved = read(slice);
      if (!saved) return;
      PERSISTED[slice].forEach(function (key) {
        if (saved[key] !== undefined) state[slice][key] = saved[key];
      });
    });
    repairChords(state.chords);
  }

  function notify() {
    listeners.forEach(function (fn) {
      fn(state);
    });
  }

  // Merge a patch into one slice, save it, and tell the UI to redraw.
  function update(slice, patch) {
    Object.keys(patch).forEach(function (key) {
      state[slice][key] = patch[key];
    });
    write(slice);
    notify();
  }

  function subscribe(fn) {
    listeners.push(fn);
  }

  // --- chords ---------------------------------------------------------------

  var chords = {
    setRoot: function (root) {
      update('chords', { root: root, shapeIndex: 0 });
    },
    // The type is what the user actually asked for (often by tapping a key chord
    // over on Scales), so a four-note one drops triad mode rather than being
    // rewritten into a quality they didn't pick.
    setChordType: function (chordType) {
      var viewMode = state.chords.viewMode;
      if (viewMode === 'triads' && !FM.isTriadQuality(chordType)) {
        viewMode = 'caged';
      }
      update('chords', { chordType: chordType, shapeIndex: 0, viewMode: viewMode });
    },
    // Going the other way the mode is what was asked for, so an incompatible
    // type lands on the nearest quality that has shapes.
    setViewMode: function (viewMode) {
      var chordType = state.chords.chordType;
      if (viewMode === 'triads' && !FM.isTriadQuality(chordType)) {
        chordType = 'major';
      }
      update('chords', { viewMode: viewMode, shapeIndex: 0, chordType: chordType });
    },
    setStringSet: function (stringSet) {
      update('chords', { stringSet: stringSet, shapeIndex: 0 });
    },
    setShapeIndex: function (shapeIndex) {
      update('chords', { shapeIndex: shapeIndex });
    },
  };

  // --- scales ---------------------------------------------------------------

  var scales = {
    setRoot: function (root) {
      update('scales', { root: root });
    },
    setScale: function (scaleType) {
      update('scales', { scaleType: scaleType });
    },
    setPosition: function (position) {
      update('scales', { position: position });
    },
  };

  // --- settings -------------------------------------------------------------

  var settings = {
    setFrets: function (frets) {
      update('settings', { frets: frets });
    },
    setTuning: function (tuning) {
      update('settings', { tuning: tuning });
    },
    setThemeMode: function (themeMode) {
      update('settings', { themeMode: themeMode });
    },
  };

  // --- metronome ------------------------------------------------------------

  var MIN_BPM = 40;
  var MAX_BPM = 240;

  function clampBpm(n) {
    return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));
  }

  var practice = {
    setBpm: function (bpm) {
      update('practice', { bpm: clampBpm(bpm) });
    },
    nudgeBpm: function (delta) {
      update('practice', { bpm: clampBpm(state.practice.bpm + delta) });
    },
    setBeatsPerMeasure: function (n) {
      update('practice', { beatsPerMeasure: n });
    },
    setAccentFirst: function (on) {
      update('practice', { accentFirst: on });
    },
    setPlaying: function (on) {
      update('practice', { isPlaying: on });
    },
  };

  load();

  FM.store = {
    state: state,
    subscribe: subscribe,
    chords: chords,
    scales: scales,
    settings: settings,
    practice: practice,
    BPM_RANGE: { min: MIN_BPM, max: MAX_BPM },
    BEATS_OPTIONS: [2, 3, 4, 6],
    clampBpm: clampBpm,
  };
})((window.FM = window.FM || {}));

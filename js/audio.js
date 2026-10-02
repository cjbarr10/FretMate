// The metronome click, synthesized. No audio files, and nothing here returns a
// promise: the Web Audio calls that matter (createOscillator, start, stop) are
// all synchronous.
//
// The context is created on first use rather than at load, because the first
// use always follows a button press — which is exactly the user gesture
// browsers require before audio may start.
(function (FM) {
  'use strict';

  var ctx = null;
  var unavailable = false;

  function context() {
    if (ctx) return ctx;
    if (unavailable) return null;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      unavailable = true;
      return null;
    }
    ctx = new Ctor();
    return ctx;
  }

  // The clock the metronome schedules against. The audio clock is the accurate
  // one — it doesn't drift or get throttled in a background tab — but if this
  // browser has no Web Audio at all, a wall clock in the same units keeps the
  // beat running silently instead of stalling.
  function now() {
    var audio = context();
    if (audio) return audio.currentTime;
    return window.performance.now() / 1000;
  }

  // A click is an envelope, not a note: near-instant attack, ~40ms decay. The
  // accent is higher and a little louder so it reads as beat 1 without sounding
  // like a different instrument.
  //
  // `when` is a time on the audio clock, so clicks can be queued slightly ahead
  // of the beat and land exactly on it.
  function click(kind, when) {
    var audio = context();
    if (!audio) return;

    var at = when;
    if (at === undefined || at < audio.currentTime) at = audio.currentTime;

    var freq = 1000;
    var peak = 0.3;
    if (kind === 'accent') {
      freq = 1500;
      peak = 0.45;
    }

    var osc = audio.createOscillator();
    var gain = audio.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, at);

    // exponential ramps can't touch zero, hence the small floor values
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);

    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(at);
    osc.stop(at + 0.05);
  }

  FM.audio = { click: click, now: now };
})((window.FM = window.FM || {}));

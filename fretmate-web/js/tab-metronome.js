// Metronome tab, plus a practice stopwatch.
//
// Beats are queued a fraction of a second ahead on the audio clock rather than
// played straight from a setInterval, because a JS timer drifts and gets
// throttled in a background tab — audible on anything you'd actually practise
// to. The interval below only decides *when to queue*, never when a click
// sounds, so its own jitter doesn't reach your ears.
(function (FM) {
  'use strict';

  var ui = FM.ui;
  var h = ui.h;

  var LOOKAHEAD_MS = 25; // how often the scheduler wakes up
  var SCHEDULE_AHEAD = 0.15; // seconds of clicks queued in advance

  // Engine state lives at module scope so a re-render never interrupts the beat.
  var schedulerId = null;
  var nextBeatTime = 0;
  var nextBeatIndex = 0;
  var currentBeat = 0;
  var paintTimers = [];

  var timerId = null;
  var timerSeconds = 0;
  var timerRunning = false;

  var tapTimes = [];

  // DOM handles, re-captured on every render
  var dotNodes = [];
  var timerNode = null;

  function formatTimer(totalSeconds) {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function paintBeat() {
    dotNodes.forEach(function (node, i) {
      if (FM.store.state.practice.isPlaying && i === currentBeat) {
        node.classList.add('is-on');
      } else {
        node.classList.remove('is-on');
      }
    });
  }

  function clearPaintTimers() {
    paintTimers.forEach(function (id) {
      window.clearTimeout(id);
    });
    paintTimers = [];
  }

  function scheduler() {
    var p = FM.store.state.practice;
    var t = FM.audio.now();

    while (nextBeatTime < t + SCHEDULE_AHEAD) {
      var kind = 'tick';
      if (p.accentFirst && nextBeatIndex === 0) kind = 'accent';
      FM.audio.click(kind, nextBeatTime);

      // light the dot at the moment the queued click actually sounds
      var beat = nextBeatIndex;
      var delay = Math.max(0, (nextBeatTime - t) * 1000);
      paintTimers.push(
        window.setTimeout(function () {
          currentBeat = beat;
          paintBeat();
        }, delay)
      );

      // re-read the tempo each pass, so a BPM change takes effect within one
      // lookahead window instead of needing a restart
      nextBeatTime += 60 / p.bpm;
      nextBeatIndex = (nextBeatIndex + 1) % p.beatsPerMeasure;
    }
  }

  function start() {
    if (schedulerId !== null) return;
    currentBeat = 0;
    nextBeatIndex = 0;
    // a hair of headroom so the very first click isn't already in the past
    nextBeatTime = FM.audio.now() + 0.06;
    schedulerId = window.setInterval(scheduler, LOOKAHEAD_MS);
    scheduler();
    FM.store.practice.setPlaying(true);
  }

  function stop() {
    if (schedulerId !== null) {
      window.clearInterval(schedulerId);
      schedulerId = null;
    }
    clearPaintTimers();
    currentBeat = 0;
    FM.store.practice.setPlaying(false);
  }

  function togglePlay() {
    if (schedulerId === null) {
      start();
    } else {
      stop();
    }
  }

  // Average the gaps between the last few taps (within 2.5s of each other) into
  // a BPM. Resets naturally if the person pauses too long.
  function tapTempo() {
    var now = Date.now();
    tapTimes = tapTimes
      .concat([now])
      .filter(function (t) {
        return now - t < 2500;
      })
      .slice(-6);

    if (tapTimes.length < 2) return;

    var gaps = [];
    for (var i = 1; i < tapTimes.length; i++) gaps.push(tapTimes[i] - tapTimes[i - 1]);
    var total = gaps.reduce(function (a, b) {
      return a + b;
    }, 0);
    FM.store.practice.setBpm(60000 / (total / gaps.length));
  }

  function tickTimer() {
    timerSeconds += 1;
    if (timerNode) timerNode.textContent = formatTimer(timerSeconds);
  }

  function toggleTimer() {
    if (timerRunning) {
      window.clearInterval(timerId);
      timerId = null;
      timerRunning = false;
    } else {
      timerId = window.setInterval(tickTimer, 1000);
      timerRunning = true;
    }
    FM.app.rerender();
  }

  function resetTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
    timerRunning = false;
    timerSeconds = 0;
    FM.app.rerender();
  }

  function render(root) {
    var p = FM.store.state.practice;
    var actions = FM.store.practice;

    root.appendChild(h('header.page-head', h('h1.page-title', 'Metronome')));

    // --- BPM display + steppers ---
    var steppers = h('div.bpm-row');
    [-5, -1].forEach(function (delta) {
      steppers.appendChild(
        ui.button('–' + Math.abs(delta), {
          className: 'btn--step',
          onClick: function () {
            actions.nudgeBpm(delta);
          },
        })
      );
    });
    steppers.appendChild(
      h('div.bpm-display', h('span.bpm-value', String(p.bpm)), h('span.bpm-unit', 'BPM'))
    );
    [1, 5].forEach(function (delta) {
      steppers.appendChild(
        ui.button('+' + delta, {
          className: 'btn--step',
          onClick: function () {
            actions.nudgeBpm(delta);
          },
        })
      );
    });

    // --- beat indicator ---
    var beatRow = h('div.beat-row');
    dotNodes = [];
    for (var i = 0; i < p.beatsPerMeasure; i++) {
      var node = h('i.beat-dot');
      if (p.accentFirst && i === 0) node.classList.add('is-accent');
      beatRow.appendChild(node);
      dotNodes.push(node);
    }

    var playLabel = 'Start';
    if (p.isPlaying) playLabel = 'Stop';

    var transportPanel = h('section.panel.panel--center',
      steppers,
      h('p.hint', FM.store.BPM_RANGE.min + '–' + FM.store.BPM_RANGE.max + ' BPM'),
      beatRow,
      h('div.btn-row',
        ui.button(playLabel, { active: p.isPlaying, className: 'btn--wide', onClick: togglePlay }),
        ui.button('Tap Tempo', { variant: 'accent', active: true, onClick: tapTempo })
      )
    );

    // --- meter + accent ---
    var meterPanel = h('section.panel');
    meterPanel.appendChild(ui.sectionLabel('Beats per measure'));
    meterPanel.appendChild(
      ui.chipRow(
        FM.store.BEATS_OPTIONS.map(function (n) {
          return { label: String(n), value: n };
        }),
        function (item) {
          return item.value === p.beatsPerMeasure;
        },
        function (item) {
          actions.setBeatsPerMeasure(item.value);
        }
      )
    );

    meterPanel.appendChild(ui.sectionLabel('Accent first beat'));
    meterPanel.appendChild(
      h('div.btn-row',
        ui.button('On', {
          active: p.accentFirst,
          onClick: function () {
            actions.setAccentFirst(true);
          },
        }),
        ui.button('Off', {
          active: !p.accentFirst,
          onClick: function () {
            actions.setAccentFirst(false);
          },
        })
      )
    );

    // --- practice timer ---
    var timerLabel = 'Start';
    if (timerRunning) timerLabel = 'Pause';

    timerNode = h('p.timer-value', formatTimer(timerSeconds));
    meterPanel.appendChild(ui.sectionLabel('Practice timer'));
    meterPanel.appendChild(timerNode);
    meterPanel.appendChild(
      h('div.btn-row',
        ui.button(timerLabel, { active: timerRunning, variant: 'accent', onClick: toggleTimer }),
        ui.button('Reset', { onClick: resetTimer })
      )
    );

    root.appendChild(h('div.cols.cols--even', transportPanel, meterPanel));

    // the dots were just rebuilt, so restore the beat that's currently sounding
    paintBeat();
  }

  FM.tabs = FM.tabs || {};
  FM.tabs.metronome = { render: render };
})((window.FM = window.FM || {}));

// Scales tab: a scale across the whole neck or boxed into one of five
// positions, plus the chords that key actually contains.
(function (FM) {
  'use strict';

  var ui = FM.ui;
  var h = ui.h;

  var POSITIONS = [
    { key: 'all', label: 'All' },
    { key: 0, label: 'P1' },
    { key: 1, label: 'P2' },
    { key: 2, label: 'P3' },
    { key: 3, label: 'P4' },
    { key: 4, label: 'P5' },
  ];

  // View-only, so it lives here rather than in the saved store.
  var sevenths = false;

  function render(root) {
    var s = FM.store.state.scales;
    var settings = FM.store.state.settings;
    var actions = FM.store.scales;

    var tuning = FM.TUNINGS[settings.tuning] || FM.TUNINGS.standard;

    // "All" shows the scale across the whole neck; a position shows just that box
    var notes;
    var window_;
    if (s.position === 'all') {
      notes = FM.getScaleNotes(s.root, s.scaleType, tuning, settings.frets);
      window_ = null;
    } else {
      notes = FM.getScaleNotesInPosition(s.root, s.scaleType, tuning, s.position, settings.frets);
      window_ = FM.getPositionWindow(s.root, s.scaleType, tuning, s.position, settings.frets);
    }

    var scale = FM.getScale(s.scaleType);
    var noteList = FM.getScaleNoteList(s.root, s.scaleType);

    root.appendChild(
      h('header.page-head',
        h('h1.page-title', 'Scales'),
        h('p.page-subtitle', FM.pcName(s.root) + ' ' + scale.label)
      )
    );

    // --- controls ---
    var controls = h('section.panel');

    controls.appendChild(ui.sectionLabel('Root'));
    controls.appendChild(
      ui.chipRow(
        FM.ROOTS.map(function (r) {
          return { label: r.name, pc: r.pc };
        }),
        function (item) {
          return item.pc === s.root;
        },
        function (item) {
          actions.setRoot(item.pc);
        }
      )
    );

    controls.appendChild(ui.sectionLabel('Scale'));
    controls.appendChild(
      ui.chipRow(
        FM.SCALE_LIST,
        function (item) {
          return item.key === s.scaleType;
        },
        function (item) {
          actions.setScale(item.key);
        }
      )
    );

    controls.appendChild(ui.sectionLabel('Position'));
    controls.appendChild(
      ui.chipRow(
        POSITIONS,
        function (item) {
          return item.key === s.position;
        },
        function (item) {
          actions.setPosition(item.key);
        },
        'accent'
      )
    );

    // "Frets 5–8" hint, only when a single position is selected
    if (window_) {
      controls.appendChild(
        h('p.window-hint', 'Frets ' + window_.start + '–' + window_.end)
      );
    }

    root.appendChild(controls);

    // --- the neck ---
    root.appendChild(
      FM.renderFretboard({ notes: notes, frets: settings.frets, tuning: settings.tuning })
    );

    // --- formula + notes in key, side by side ---
    var formulaPanel = h('section.panel',
      h('h2.section-label', 'Formula'),
      h('p.big-text.big-text--accent', scale.formula.join('  –  '))
    );

    var keyPanel = h('section.panel',
      h('h2.section-label', 'Notes in key'),
      h('p.big-text', noteList.map(function (pc) {
        return FM.pcName(pc);
      }).join('  ·  ')),
      h('div.legend',
        h('span.legend-item', h('i.legend-dot.is-root'), 'Root'),
        h('span.legend-item', h('i.legend-dot'), 'Scale note')
      )
    );

    root.appendChild(h('div.cols', formulaPanel, keyPanel));

    // --- chords in this key ---
    // Only seven-note scales have diatonic harmony — you can't stack thirds
    // through a pentatonic and get meaningful chords.
    if (!FM.supportsDiatonicChords(s.scaleType)) return;

    var keyChords = FM.getDiatonicChords(s.root, s.scaleType, sevenths);

    var head = h('div.harmony-head',
      h('h2.section-label', 'Chords in this key'),
      h('div.chip-row',
        ui.chip('Triads', !sevenths, function () {
          sevenths = false;
          FM.app.rerender();
        }),
        ui.chip('Sevenths', sevenths, function () {
          sevenths = true;
          FM.app.rerender();
        })
      )
    );
    root.appendChild(head);

    var grid = h('div.chord-grid');
    keyChords.forEach(function (ch) {
      var card = h('button.chord-card',
        h('span.chord-roman', ch.roman),
        h('span.chord-name', ch.name)
      );
      card.type = 'button';
      card.addEventListener('click', function () {
        FM.store.chords.setRoot(ch.rootPc);
        FM.store.chords.setChordType(ch.typeKey);
        FM.app.goTo('chords');
      });
      grid.appendChild(card);
    });
    root.appendChild(grid);

    root.appendChild(h('p.hint', 'Tap a chord for all of its shapes on the Chords tab.'));

    var hasApproximated = keyChords.some(function (ch) {
      return ch.approximated;
    });
    if (hasApproximated) {
      root.appendChild(
        h('p.hint', "Two chords here have sevenths this app can't voice yet, so they show as triads.")
      );
    }
  }

  FM.tabs = FM.tabs || {};
  FM.tabs.scales = { render: render };
})((window.FM = window.FM || {}));

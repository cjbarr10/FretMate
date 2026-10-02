// Chords tab: pick a root and a quality, then read the voicing as a chord
// chart, as note names, and as dots on the full neck.
(function (FM) {
  'use strict';

  var ui = FM.ui;
  var h = ui.h;

  var INTERVAL_LABELS = {
    0: 'R', 2: '9', 3: 'b3', 4: '3', 5: '4', 6: 'b5', 7: '5',
    8: '#5', 9: '6', 10: 'b7', 11: '7',
  };

  function render(root) {
    var s = FM.store.state.chords;
    var settings = FM.store.state.settings;
    var actions = FM.store.chords;

    // triad mode only offers the four three-note qualities and the derived
    // inversions; CAGED mode offers every chord type and its barre voicings
    var shapes = [];
    if (s.viewMode === 'triads') {
      shapes = FM.getTriadShapes(s.root, s.chordType, s.stringSet);
    }

    // Nothing to voice as a triad — a four-note type, say — so fall back to the
    // CAGED forms, which exist for every type. The store normally keeps this
    // from happening; this is the last line before an empty shape list.
    var isTriad = shapes.length > 0;
    if (!isTriad) shapes = FM.getChordShapes(s.root, s.chordType);

    var types;
    if (isTriad) {
      types = FM.TRIAD_QUALITIES.map(function (k) {
        return FM.CHORD_TYPES[k];
      });
    } else {
      types = FM.CHORD_TYPE_LIST;
    }

    var activeIndex = Math.max(0, Math.min(s.shapeIndex, shapes.length - 1));
    var active = shapes[activeIndex];

    root.appendChild(
      h('header.page-head',
        h('h1.page-title', 'Chords'),
        h('p.page-subtitle', FM.chordName(s.root, s.chordType))
      )
    );

    // --- controls ---
    var controls = h('section.panel');

    controls.appendChild(
      h('div.mode-row',
        ui.chip('CAGED forms', !isTriad, function () {
          actions.setViewMode('caged');
        }),
        ui.chip('Triad shapes', isTriad, function () {
          actions.setViewMode('triads');
        })
      )
    );

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

    controls.appendChild(ui.sectionLabel('Type'));
    controls.appendChild(
      ui.chipRow(
        types,
        function (t) {
          return t.key === s.chordType;
        },
        function (t) {
          actions.setChordType(t.key);
        }
      )
    );

    // the string-set picker only makes sense for triads
    if (isTriad) {
      controls.appendChild(ui.sectionLabel('String set'));
      controls.appendChild(
        ui.chipRow(
          FM.STRING_SETS.map(function (set, i) {
            return { label: set.label, index: i };
          }),
          function (item) {
            return item.index === s.stringSet;
          },
          function (item) {
            actions.setStringSet(item.index);
          }
        )
      );
    }

    var voicingLabel = 'Voicing';
    if (isTriad) voicingLabel = 'Inversion';

    controls.appendChild(ui.sectionLabel(voicingLabel));
    controls.appendChild(
      ui.chipRow(
        shapes.map(function (shape, i) {
          return { label: shape.label, index: i };
        }),
        function (item) {
          return item.index === activeIndex;
        },
        function (item) {
          actions.setShapeIndex(item.index);
        },
        'accent'
      )
    );

    root.appendChild(controls);

    // --- diagram + notes, side by side ---
    // the line under the diagram describing the shape on screen
    var positionHint;
    if (isTriad) {
      positionHint =
        active.label + ' · ' + active.bass + ' in the bass · ' +
        FM.STRING_SETS[s.stringSet].label;
    } else {
      var placement = 'barre at fret ' + active.barreFret;
      if (active.isOpen) placement = 'open position';
      positionHint = active.label + ' · ' + placement;
    }

    var diagramPanel = h('section.panel.panel--center',
      FM.renderChordDiagram(active),
      h('p.hint', positionHint)
    );

    var noteRow = h('div.note-row');
    // shape notes run high e -> low E, so walk them backwards to read low to high
    for (var i = active.notes.length - 1; i >= 0; i--) {
      var n = active.notes[i];
      // a muted string has no note to show
      var noteText = '✕';
      var degreeText = '';
      if (n) {
        noteText = FM.pcName(n.pc);
        if (INTERVAL_LABELS[n.interval] !== undefined) {
          degreeText = INTERVAL_LABELS[n.interval];
        } else {
          degreeText = String(n.interval);
        }
      }
      var nameNode = h('span.note-name', noteText);
      if (n && n.isRoot) nameNode.classList.add('is-root');
      noteRow.appendChild(h('div.note-cell', nameNode, h('span.note-degree', degreeText)));
    }

    var notesPanel = h('section.panel',
      h('h2.section-label', 'Notes'),
      noteRow,
      h('p.hint.hint--center', 'low E → high e')
    );

    root.appendChild(h('div.cols', diagramPanel, notesPanel));

    // --- the full neck ---
    root.appendChild(ui.sectionLabel('On the neck'));
    root.appendChild(
      FM.renderFretboard({
        notes: FM.toFretboardNotes(active),
        frets: settings.frets,
        tuning: settings.tuning,
      })
    );
  }

  FM.tabs = FM.tabs || {};
  FM.tabs.chords = { render: render };
})((window.FM = window.FM || {}));

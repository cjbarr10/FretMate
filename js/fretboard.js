// The neck. Rows are drawn top -> bottom as high-e (5) down to low-E (0),
// matching how a player looks down at the guitar.
//
// The whole thing is one CSS grid so the frets divide the available width
// evenly — on a desktop the full neck fits without sideways scrolling.
(function (FM) {
  'use strict';

  var h = FM.ui.h;

  var ROW_ORDER = [5, 4, 3, 2, 1, 0];
  var SINGLE_INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
  var DOUBLE_INLAYS = [12, 24];

  // low E (0) is thickest, high e (5) is thinnest
  function stringThickness(stringIndex) {
    return 1.5 + (5 - stringIndex) * 0.6;
  }

  function dot(note) {
    var node = h('span.fb-dot', FM.pcName(note.pc));
    if (note.isRoot) node.classList.add('is-root');
    return node;
  }

  // notes: [{ string, fret, pc, interval, isRoot }] — string 0 = low E
  function render(options) {
    var notes = options.notes;
    var fretCount = options.frets;
    var tuning = FM.TUNINGS[options.tuning] || FM.TUNINGS.standard;

    // index by "string-fret" for O(1) lookup while drawing
    var map = {};
    notes.forEach(function (n) {
      map[n.string + '-' + n.fret] = n;
    });

    var board = h('div.fretboard');
    board.style.setProperty('--frets', String(fretCount));

    ROW_ORDER.forEach(function (s) {
      var row = h('div.fb-row');
      var open = map[s + '-0'];

      // the open-string column shows a dot when that note is in the shape,
      // otherwise just the string's name
      var openCell = h('div.fb-open');
      if (open) {
        openCell.appendChild(dot(open));
      } else {
        openCell.appendChild(h('span.fb-open-label', tuning.names[s]));
      }
      row.appendChild(openCell);
      row.appendChild(h('div.fb-nut'));

      for (var f = 1; f <= fretCount; f++) {
        var cell = h('div.fb-cell');
        var line = h('div.fb-string');
        line.style.height = stringThickness(s) + 'px';
        cell.appendChild(line);
        var n = map[s + '-' + f];
        if (n) cell.appendChild(dot(n));
        row.appendChild(cell);
      }

      board.appendChild(row);
    });

    // fret-number row with inlay markers
    var nums = h('div.fb-row.fb-numrow');
    nums.appendChild(h('div.fb-open'));
    nums.appendChild(h('div.fb-nut-spacer'));

    for (var i = 1; i <= fretCount; i++) {
      var numCell = h('div.fb-num');
      // 12 and 24 get a double inlay, the usual positions a single one, and
      // everything else a same-sized blank so the numbers stay lined up
      if (DOUBLE_INLAYS.indexOf(i) !== -1) {
        numCell.appendChild(h('div.fb-inlay-double', h('i.fb-inlay'), h('i.fb-inlay')));
      } else if (SINGLE_INLAYS.indexOf(i) !== -1) {
        numCell.appendChild(h('i.fb-inlay'));
      } else {
        numCell.appendChild(h('i.fb-inlay.is-blank'));
      }
      numCell.appendChild(h('span.fb-numtext', String(i)));
      nums.appendChild(numCell);
    }

    board.appendChild(nums);
    return board;
  }

  FM.renderFretboard = render;
})((window.FM = window.FM || {}));

// A chord chart: six vertical strings, five frets, read with the low E on the
// left. Shapes near the nut draw the nut bar; higher ones get a "5fr" hint
// instead and slide the window up to where the shape actually sits.
(function (FM) {
  'use strict';

  var h = FM.ui.h;

  var COL_W = 34;
  var ROW_H = 42;
  var DOT = 26;
  var ROWS = 5;

  // chord-order index 5 (low E) becomes column 0
  function columnFor(chordString) {
    return 5 - chordString;
  }

  function stringForColumn(col) {
    return 5 - col;
  }

  function colX(col) {
    return col * COL_W + COL_W / 2;
  }

  function render(shape) {
    var frets = shape.frets;

    // which 5 frets to draw
    var fretted = frets.filter(function (f) {
      return f !== null && f !== undefined && f > 0;
    });

    var minF = 1;
    var maxF = 1;
    if (fretted.length) {
      minF = Math.min.apply(null, fretted);
      maxF = Math.max.apply(null, fretted);
    }

    var start = minF;
    if (maxF <= ROWS) start = 1;
    var showNut = start === 1;

    var gridW = COL_W * 6;
    var gridH = ROW_H * ROWS;

    function dotY(fret) {
      return (fret - start) * ROW_H + ROW_H / 2;
    }

    var wrap = h('div.diagram');

    // the ✕ / ○ row above the grid
    var markerRow = h('div.dg-markers');
    markerRow.style.width = gridW + 'px';
    for (var col = 0; col < 6; col++) {
      var f = frets[stringForColumn(col)];
      var text = '';
      var cell = h('span.dg-marker');
      if (f === null || f === undefined) {
        text = '✕';
        cell.classList.add('is-muted');
      } else if (f === 0) {
        text = '○';
      }
      cell.style.width = COL_W + 'px';
      cell.textContent = text;
      markerRow.appendChild(cell);
    }
    wrap.appendChild(markerRow);

    // a shape at the nut draws the thick nut bar; a higher one a plain line
    var edge = h('div.dg-nut');
    if (!showNut) edge.classList.add('is-line');
    edge.style.width = gridW + 'px';
    wrap.appendChild(edge);

    var grid = h('div.dg-grid');
    grid.style.width = gridW + 'px';
    grid.style.height = gridH + 'px';

    for (var i = 0; i < ROWS; i++) {
      var line = h('div.dg-fret');
      line.style.top = (i + 1) * ROW_H - 1 + 'px';
      line.style.width = gridW + 'px';
      grid.appendChild(line);
    }

    // strings — thicker toward the low E side
    for (var c2 = 0; c2 < 6; c2++) {
      var chordString = stringForColumn(c2);
      var sl = h('div.dg-string');
      sl.style.left = colX(c2) - 1 + 'px';
      sl.style.height = gridH + 'px';
      sl.style.width = 1 + chordString * 0.35 + 'px';
      grid.appendChild(sl);
    }

    // barre, only when it falls inside the drawn window
    var barre = shape.barre;
    if (barre && barre.fret >= start && barre.fret < start + ROWS) {
      var fromX = colX(columnFor(barre.fromString));
      var toX = colX(columnFor(barre.toString));
      var bar = h('div.dg-barre');
      bar.style.top = dotY(barre.fret) - DOT / 2 + 'px';
      bar.style.height = DOT + 'px';
      bar.style.left = Math.min(fromX, toX) - DOT / 2 + 'px';
      bar.style.width = Math.abs(toX - fromX) + DOT + 'px';
      grid.appendChild(bar);
    }

    frets.forEach(function (fret, chordStr) {
      if (fret === null || fret === undefined || fret === 0) return;
      if (fret < start || fret >= start + ROWS) return;

      var note = null;
      if (shape.notes) note = shape.notes[chordStr];

      var node = h('div.dg-dot');
      if (note && note.isRoot) node.classList.add('is-root');
      node.style.top = dotY(fret) - DOT / 2 + 'px';
      node.style.left = colX(columnFor(chordStr)) - DOT / 2 + 'px';
      if (note) node.textContent = FM.pcName(note.pc);
      grid.appendChild(node);
    });

    wrap.appendChild(grid);

    // shapes away from the nut need a "5fr" style hint
    if (!showNut) wrap.appendChild(h('div.dg-fretlabel', start + 'fr'));

    return wrap;
  }

  FM.renderChordDiagram = render;
})((window.FM = window.FM || {}));

import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { font } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { pcName } from '../lib/notes';

const COL_W = 32;
const ROW_H = 36;
const DOT = 22;
const ROWS = 5;
const MARKER_H = 20;

// A chord chart is read with the low E on the left, so chord-order index 5
// (low E) becomes column 0. Left-handed mode mirrors that.
function columnFor(chordString, leftHanded) {
  const col = 5 - chordString;
  return leftHanded ? 5 - col : col;
}

export default function ChordDiagram({ shape, leftHanded = false, showNoteNames = true }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { frets, barre } = shape;

  // which 5 frets to draw: near the nut shows the nut, higher shapes get a fret label
  const fretted = frets.filter((f) => f !== null && f !== undefined && f > 0);
  const minF = fretted.length ? Math.min(...fretted) : 1;
  const maxF = fretted.length ? Math.max(...fretted) : 1;
  const start = maxF <= ROWS ? 1 : minF;
  const showNut = start === 1;

  const gridW = COL_W * 6;
  const gridH = ROW_H * ROWS;

  const dotY = (fret) => (fret - start) * ROW_H + ROW_H / 2;
  const colX = (col) => col * COL_W + COL_W / 2;

  return (
    <View style={styles.wrap}>
      {/* muted / open markers */}
      <View style={[styles.markerRow, { width: gridW }]}>
        {Array.from({ length: 6 }).map((_, col) => {
          const chordString = leftHanded ? col : 5 - col;
          const f = frets[chordString];
          return (
            <View key={col} style={{ width: COL_W, alignItems: 'center' }}>
              <Text style={[styles.marker, f === null && styles.markerMuted]}>
                {f === null || f === undefined ? '✕' : f === 0 ? '○' : ''}
              </Text>
            </View>
          );
        })}
      </View>

      {showNut ? <View style={[styles.nut, { width: gridW }]} /> : <View style={[styles.topLine, { width: gridW }]} />}

      <View style={{ width: gridW, height: gridH }}>
        {/* fret wires */}
        {Array.from({ length: ROWS }).map((_, i) => (
          <View key={`f${i}`} style={[styles.fretLine, { top: (i + 1) * ROW_H - 1, width: gridW }]} />
        ))}

        {/* strings — thicker toward the low E side */}
        {Array.from({ length: 6 }).map((_, col) => {
          const chordString = leftHanded ? col : 5 - col;
          return (
            <View
              key={`s${col}`}
              style={[
                styles.stringLine,
                { left: colX(col) - 1, height: gridH, width: 1 + chordString * 0.35 },
              ]}
            />
          );
        })}

        {/* barre */}
        {barre && barre.fret >= start && barre.fret < start + ROWS ? (
          <View
            style={[
              styles.barre,
              {
                top: dotY(barre.fret) - DOT / 2,
                height: DOT,
                left: Math.min(colX(columnFor(barre.fromString, leftHanded)), colX(columnFor(barre.toString, leftHanded))) - DOT / 2,
                width:
                  Math.abs(
                    colX(columnFor(barre.toString, leftHanded)) - colX(columnFor(barre.fromString, leftHanded))
                  ) + DOT,
              },
            ]}
          />
        ) : null}

        {/* fingered notes */}
        {frets.map((f, chordString) => {
          if (f === null || f === undefined || f === 0) return null;
          if (f < start || f >= start + ROWS) return null;
          const col = columnFor(chordString, leftHanded);
          const note = shape.notes?.[chordString];
          const isRoot = note?.isRoot;
          return (
            <View
              key={`d${chordString}`}
              style={[
                styles.dot,
                {
                  top: dotY(f) - DOT / 2,
                  left: colX(col) - DOT / 2,
                  backgroundColor: isRoot ? c.primary : c.text,
                  borderColor: isRoot ? c.primaryDark : c.muted,
                },
              ]}
            >
              {showNoteNames && note ? (
                <Text style={[styles.dotText, { color: c.onPrimary }]}>{pcName(note.pc)}</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {!showNut ? <Text style={styles.fretLabel}>{start}fr</Text> : null}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  wrap: { alignItems: 'center' },
  markerRow: { flexDirection: 'row', height: MARKER_H, alignItems: 'center' },
  marker: { color: c.muted, fontSize: font.size.sm, fontWeight: font.weight.bold },
  markerMuted: { color: c.danger },
  nut: { height: 6, backgroundColor: c.muted, borderRadius: 2 },
  topLine: { height: 2, backgroundColor: c.border },
  fretLine: { position: 'absolute', left: 0, height: 2, backgroundColor: c.border },
  stringLine: { position: 'absolute', top: 0, backgroundColor: c.muted, opacity: 0.5 },
  barre: {
    position: 'absolute',
    backgroundColor: c.primary,
    opacity: 0.35,
    borderRadius: DOT / 2,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  dotText: { fontSize: 9, fontWeight: font.weight.bold },
  fretLabel: {
    color: c.muted,
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
    marginTop: 6,
  },
});

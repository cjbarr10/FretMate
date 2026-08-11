import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { radius, font } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { pcName, TUNINGS } from '../lib/notes';

const FRET_W = 48;
const STRING_H = 38;
const DOT = 28;
const OPEN_W = 40;
const NUT_W = 6;

const SINGLE_INLAYS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
const DOUBLE_INLAYS = new Set([12, 24]);

// Rows are drawn top -> bottom as high-e (5) down to low-E (0), matching how a
// right-handed player looks down at the neck. Left-handed mode reverses frets.
const ROW_ORDER = [5, 4, 3, 2, 1, 0];

function stringThickness(stringIndex) {
  // low E (0) is thickest, high e (5) is thinnest
  return 1.5 + (5 - stringIndex) * 0.6;
}

function Dot({ note }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const isRoot = note.isRoot;
  return (
    <View
      style={[
        styles.dot,
        {
          backgroundColor: isRoot ? c.primary : c.accent,
          borderColor: isRoot ? c.primaryDark : c.accentDark,
        },
      ]}
    >
      <Text style={[styles.dotText, { color: isRoot ? c.onPrimary : c.onAccent }]}>
        {pcName(note.pc)}
      </Text>
    </View>
  );
}

export default function Fretboard({ notes, frets, tuning = 'standard', leftHanded = false }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const t = TUNINGS[tuning] || TUNINGS.standard;

  // index notes by "string-fret" for O(1) lookup while rendering
  const map = {};
  notes.forEach((n) => {
    map[`${n.string}-${n.fret}`] = n;
  });

  const fretNumbers = Array.from({ length: frets }, (_, i) => i + 1); // 1..frets
  const orderedFrets = leftHanded ? [...fretNumbers].reverse() : fretNumbers;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.neck}>
        {ROW_ORDER.map((s) => {
          const open = map[`${s}-0`];
          const thickness = stringThickness(s);
          return (
            <View key={s} style={styles.row}>
              {/* open string / label column */}
              <View style={styles.openCell}>
                {open ? <Dot note={open} /> : <Text style={styles.openLabel}>{t.names[s]}</Text>}
              </View>
              <View style={styles.nut} />
              {orderedFrets.map((f) => {
                const n = map[`${s}-${f}`];
                return (
                  <View key={f} style={styles.fretCell}>
                    <View style={[styles.stringLine, { height: thickness }]} />
                    {n ? <Dot note={n} /> : null}
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* fret-number row with inlay markers */}
        <View style={styles.numRow}>
          <View style={styles.openCell} />
          <View style={styles.nutSpacer} />
          {orderedFrets.map((f) => (
            <View key={f} style={styles.numCell}>
              {DOUBLE_INLAYS.has(f) ? (
                <View style={styles.doubleInlay}>
                  <View style={styles.inlayDot} />
                  <View style={styles.inlayDot} />
                </View>
              ) : SINGLE_INLAYS.has(f) ? (
                <View style={styles.inlayDot} />
              ) : (
                <View style={styles.inlayPlaceholder} />
              )}
              <Text style={styles.numText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  scroll: {
    paddingVertical: 8,
  },
  neck: {
    backgroundColor: c.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    height: STRING_H,
    alignItems: 'center',
  },
  openCell: {
    width: OPEN_W,
    height: STRING_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openLabel: {
    color: c.muted,
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
  },
  nut: {
    width: NUT_W,
    height: STRING_H,
    backgroundColor: c.muted,
  },
  fretCell: {
    width: FRET_W,
    height: STRING_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 2,
    borderRightColor: c.border,
  },
  stringLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: c.muted,
    opacity: 0.55,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotText: {
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
  },
  numRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  nutSpacer: {
    width: NUT_W,
  },
  numCell: {
    width: FRET_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    color: c.muted,
    fontSize: font.size.xs,
    marginTop: 2,
  },
  inlayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.border,
    marginHorizontal: 1,
  },
  inlayPlaceholder: {
    width: 6,
    height: 6,
  },
  doubleInlay: {
    flexDirection: 'row',
  },
});

import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChords } from '../../src/store/useChords';
import { useSettings } from '../../src/store/useSettings';
import {
  CHORD_TYPES,
  CHORD_TYPE_LIST,
  TRIAD_QUALITIES,
  STRING_SETS,
  getChordShapes,
  getTriadShapes,
  chordName,
  toFretboardNotes,
} from '../../src/lib/chordEngine';
import { playChordShape, getPlaybackError } from '../../src/lib/notePlayer';
import { ROOTS, pcName } from '../../src/lib/notes';
import ChordDiagram from '../../src/components/ChordDiagram';
import Fretboard from '../../src/components/Fretboard';
import Chip from '../../src/components/Chip';
import Button3D from '../../src/components/Button3D';
import { spacing, font, radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

const INTERVAL_LABELS = {
  0: 'R', 2: '9', 3: 'b3', 4: '3', 5: '4', 6: 'b5', 7: '5',
  8: '#5', 9: '6', 10: 'b7', 11: '7',
};

export default function ChordsScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const {
    root, chordType, viewMode, stringSet, shapeIndex,
    setRoot, setChordType, setViewMode, setStringSet, setShapeIndex,
  } = useChords();
  const { frets, tuning } = useSettings();
  const [playNote_, setPlayNote] = useState(null);

  const strum = async () => {
    setPlayNote(null);
    await playChordShape(active);
    // give the scheduled notes a moment to actually fire before reporting
    setTimeout(() => setPlayNote(getPlaybackError()), 400);
  };

  const isTriad = viewMode === 'triads';
  const types = isTriad ? TRIAD_QUALITIES.map((k) => CHORD_TYPES[k]) : CHORD_TYPE_LIST;
  const shapes = isTriad
    ? getTriadShapes(root, chordType, stringSet)
    : getChordShapes(root, chordType);
  const active = shapes[Math.min(shapeIndex, shapes.length - 1)];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Chords</Text>
        <Text style={styles.subtitle}>{chordName(root, chordType)}</Text>

        <View style={styles.modeRow}>
          <Chip label="CAGED forms" active={!isTriad} onPress={() => setViewMode('caged')} />
          <Chip label="Triad shapes" active={isTriad} onPress={() => setViewMode('triads')} />
        </View>

        <Text style={styles.sectionLabel}>Root</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {ROOTS.map((r) => (
            <Chip key={r.pc} label={r.name} active={root === r.pc} onPress={() => setRoot(r.pc)} />
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {types.map((t) => (
            <Chip
              key={t.key}
              label={t.label}
              active={chordType === t.key}
              onPress={() => setChordType(t.key)}
            />
          ))}
        </ScrollView>

        {isTriad ? (
          <>
            <Text style={styles.sectionLabel}>String set</Text>
            <View style={styles.chipRow}>
              {STRING_SETS.map((set, i) => (
                <Chip
                  key={set.key}
                  label={set.label}
                  active={stringSet === i}
                  onPress={() => setStringSet(i)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>{isTriad ? 'Inversion' : 'Voicing'}</Text>
        <View style={styles.chipRow}>
          {shapes.map((s, i) => (
            <Chip
              key={s.label}
              label={s.label}
              active={i === Math.min(shapeIndex, shapes.length - 1)}
              accent={c.accent}
              onAccent={c.onAccent}
              onPress={() => setShapeIndex(i)}
            />
          ))}
        </View>

        <View style={styles.diagramCard}>
          <ChordDiagram shape={active} />
          <Button3D
            label="▶  Play chord"
            color={c.accent}
            darkColor={c.accentDark}
            onColor={c.onAccent}
            active
            onPress={strum}
            style={styles.playBtn}
          />
          {playNote_ ? <Text style={styles.playError}>{playNote_}</Text> : null}
          <Text style={styles.positionHint}>
            {isTriad
              ? `${active.label} · ${active.bass} in the bass · ${STRING_SETS[stringSet].label}`
              : `${active.label} · ${active.isOpen ? 'open position' : `barre at fret ${active.barreFret}`}`}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Notes</Text>
          <View style={styles.noteRow}>
            {active.notes.map((n, i) => (
              <View key={i} style={styles.noteCell}>
                <Text style={[styles.noteName, n?.isRoot && { color: c.primary }]}>
                  {n ? pcName(n.pc) : '✕'}
                </Text>
                <Text style={styles.noteDegree}>
                  {n ? INTERVAL_LABELS[n.interval] ?? n.interval : ''}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.stringHint}>low E → high e</Text>
        </View>

        <Text style={styles.sectionLabel}>On the neck</Text>
        <Fretboard
          notes={toFretboardNotes(active)}
          frets={frets}
          tuning={tuning}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { color: c.text, fontSize: font.size.xxl, fontWeight: font.weight.bold },
  subtitle: { color: c.primary, fontSize: font.size.lg, fontWeight: font.weight.bold, marginTop: 2 },
  sectionLabel: {
    color: c.muted,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipRow: { flexGrow: 0, flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
    modeRow: { flexDirection: 'row', marginTop: spacing.lg },
  playBtn: { marginTop: spacing.lg, alignSelf: 'stretch', marginHorizontal: spacing.lg },
    playError: { color: c.danger, fontSize: font.size.xs, marginTop: spacing.sm, textAlign: 'center' },
    positionHint: {
    color: c.muted,
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
    marginTop: spacing.lg,
  },
  diagramCard: {
    marginTop: spacing.lg,
    backgroundColor: c.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  infoCard: {
    marginTop: spacing.lg,
    backgroundColor: c.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
  },
  infoTitle: {
    color: c.muted,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  noteRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: spacing.sm },
  noteCell: { alignItems: 'center', flex: 1 },
  noteName: { color: c.text, fontSize: font.size.lg, fontWeight: font.weight.bold },
  noteDegree: { color: c.muted, fontSize: font.size.xs, marginTop: 2 },
  stringHint: { color: c.muted, fontSize: font.size.xs, marginTop: spacing.sm, textAlign: 'center' },
});

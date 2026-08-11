import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFretboard } from '../../src/store/useFretboard';
import { useSettings } from '../../src/store/useSettings';
import { useChords } from '../../src/store/useChords';
import {
  SCALE_LIST,
  getScaleNotes,
  getScaleNotesInPosition,
  getPositionWindow,
  getScaleNoteList,
} from '../../src/lib/scaleEngine';
import { getDiatonicChords, supportsDiatonicChords } from '../../src/lib/harmony';
import { playSequence, notesToPitches, playChordShape, getPlaybackError } from '../../src/lib/notePlayer';
import { getChordShapes } from '../../src/lib/chordEngine';
import { ROOTS, TUNINGS, pcName } from '../../src/lib/notes';
import Fretboard from '../../src/components/Fretboard';
import Chip from '../../src/components/Chip';
import Button3D from '../../src/components/Button3D';
import { spacing, font, radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

const POSITIONS = [
  { key: 'all', label: 'All' },
  { key: 0, label: 'P1' },
  { key: 1, label: 'P2' },
  { key: 2, label: 'P3' },
  { key: 3, label: 'P4' },
  { key: 4, label: 'P5' },
];

export default function ScalesScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { root, scaleType, position, setRoot, setScale, setPosition } = useFretboard();
  const { frets, tuning } = useSettings();
  const setChordRoot = useChords((st) => st.setRoot);
  const setChordType = useChords((st) => st.setChordType);
  const router = useRouter();
  const [sevenths, setSevenths] = useState(false);
  const [playError, setPlayError] = useState(null);

  const tuningObj = TUNINGS[tuning] || TUNINGS.standard;
  const notes =
    position === 'all'
      ? getScaleNotes(root, scaleType, tuningObj, frets)
      : getScaleNotesInPosition(root, scaleType, tuningObj, position, frets);

  const window =
    position === 'all' ? null : getPositionWindow(root, scaleType, tuningObj, position, frets);

  const scale = SCALE_LIST.find((s) => s.key === scaleType) || SCALE_LIST[0];
  const noteList = getScaleNoteList(root, scaleType);

  // Only seven-note scales have diatonic harmony — you can't stack thirds
  // through a pentatonic and get meaningful chords.
  const hasHarmony = supportsDiatonicChords(scaleType);
  const keyChords = hasHarmony ? getDiatonicChords(root, scaleType, sevenths) : [];

  // Play what's actually on screen. Across the whole neck that would be
  // dozens of notes, so an octave from the root stands in for it.
  const playCurrent = () => {
    setPlayError(null);
    setTimeout(() => setPlayError(getPlaybackError()), 500);
    if (position === 'all') {
      const octave = getScaleNotes(root, scaleType, tuningObj, frets)
        .filter((n) => n.string >= 2)
        .map((n) => tuningObj.openMidi[n.string] + n.fret)
        .sort((a, b) => a - b);
      const start = octave.find((m) => m % 12 === root % 12) ?? octave[0];
      playSequence(octave.filter((m) => m >= start && m <= start + 12));
      return;
    }
    playSequence(notesToPitches(notes, tuningObj.openMidi));
  };

  // Strum a key chord without leaving the page — its first CAGED voicing is
  // the one lowest on the neck, which is the one you'd reach for.
  const strumKeyChord = (chord) => {
    const shapes = getChordShapes(chord.rootPc, chord.typeKey);
    if (shapes.length) playChordShape(shapes[0]);
  };

  const openChord = (chord) => {
    setChordRoot(chord.rootPc);
    setChordType(chord.typeKey);
    router.push('/chords');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Scales</Text>
        <Text style={styles.subtitle}>
          {pcName(root)} {scale.label}
        </Text>

        <Text style={styles.sectionLabel}>Root</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {ROOTS.map((r) => (
            <Chip key={r.pc} label={r.name} active={root === r.pc} onPress={() => setRoot(r.pc)} />
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Scale</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {SCALE_LIST.map((s) => (
            <Chip key={s.key} label={s.label} active={scaleType === s.key} onPress={() => setScale(s.key)} />
          ))}
        </ScrollView>

        <View style={styles.formulaCard}>
          <Text style={styles.infoTitle}>Formula</Text>
          <Text style={styles.formulaText}>{scale.formula.join('  –  ')}</Text>
        </View>

        <Text style={styles.sectionLabel}>Position</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {POSITIONS.map((p) => (
            <Chip
              key={String(p.key)}
              label={p.label}
              active={position === p.key}
              accent={c.accent}
              onAccent={c.onAccent}
              onPress={() => setPosition(p.key)}
            />
          ))}
        </ScrollView>

        {window ? (
          <Text style={styles.windowHint}>
            Frets {window.start}–{window.end}
          </Text>
        ) : null}

        <Button3D
          label="▶  Play scale"
          color={c.accent}
          darkColor={c.accentDark}
          onColor={c.onAccent}
          active
          onPress={playCurrent}
          style={styles.playBtn}
        />

        {playError ? <Text style={styles.playError}>{playError}</Text> : null}

        <View style={styles.fretboardWrap}>
          <Fretboard notes={notes} frets={frets} tuning={tuning} />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Notes in key</Text>
          <Text style={styles.infoNotes}>{noteList.map((pc) => pcName(pc)).join('  ·  ')}</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c.primary, borderColor: c.primaryDark }]} />
              <Text style={styles.legendText}>Root</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c.accent, borderColor: c.accentDark }]} />
              <Text style={styles.legendText}>Scale note</Text>
            </View>
          </View>
        </View>

        {hasHarmony ? (
          <>
            <View style={styles.harmonyHead}>
              <Text style={styles.sectionLabelInline}>Chords in this key</Text>
              <View style={styles.harmonyToggle}>
                <Chip label="Triads" active={!sevenths} onPress={() => setSevenths(false)} />
                <Chip label="Sevenths" active={sevenths} onPress={() => setSevenths(true)} />
              </View>
            </View>

            <View style={styles.chordGrid}>
              {keyChords.map((ch) => (
                <View key={ch.degree} style={styles.chordCard}>
                  <Pressable
                    onPress={() => openChord(ch)}
                    style={({ pressed }) => [styles.chordCardBody, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.roman}>{ch.roman}</Text>
                    <Text style={styles.chordName}>{ch.name}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => strumKeyChord(ch)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.chordPlay, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.chordPlayIcon}>▶</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <Text style={styles.harmonyHint}>
              ▶ hears it · tap the name for all five CAGED shapes
            </Text>
            {keyChords.some((ch) => ch.approximated) ? (
              <Text style={styles.harmonyHint}>
                Two chords here have sevenths this app can't voice yet, so they show as triads.
              </Text>
            ) : null}
          </>
        ) : null}
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
  chipRow: { flexGrow: 0 },
  windowHint: {
    color: c.accent,
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
    marginTop: spacing.sm,
  },
  formulaCard: {
    marginTop: spacing.lg,
    backgroundColor: c.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
  },
  formulaText: { color: c.accent, fontSize: font.size.lg, fontWeight: font.weight.bold, marginTop: spacing.sm },
  playBtn: { marginTop: spacing.lg },
  playError: { color: c.danger, fontSize: font.size.xs, marginTop: spacing.sm },
  fretboardWrap: { marginTop: spacing.lg },
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
  infoNotes: { color: c.text, fontSize: font.size.lg, fontWeight: font.weight.bold, marginTop: spacing.sm },
  legendRow: { flexDirection: 'row', marginTop: spacing.lg },
  harmonyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionLabelInline: {
    color: c.muted,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  harmonyToggle: { flexDirection: 'row' },
  chordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chordCardBody: { alignItems: 'center' },
  chordPlay: {
    marginTop: spacing.sm,
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border,
  },
  chordPlayIcon: { color: c.accent, fontSize: 11, fontWeight: font.weight.bold },
  chordCard: {
    backgroundColor: c.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minWidth: 74,
    alignItems: 'center',
  },
  roman: { color: c.accent, fontSize: font.size.xs, fontWeight: font.weight.bold, letterSpacing: 1 },
  chordName: { color: c.text, fontSize: font.size.lg, fontWeight: font.weight.bold, marginTop: 2 },
  harmonyHint: { color: c.muted, fontSize: font.size.xs, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.xl },
  legendDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, marginRight: spacing.sm },
  legendText: { color: c.muted, fontSize: font.size.sm },
});

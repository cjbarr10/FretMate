import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { usePractice, formatTimer, BPM_RANGE, BEATS_OPTIONS } from '../../src/store/usePractice';
import { fireClick, getAudioError, getFailureCount, setPlaybackAudioMode } from '../../src/lib/metronomeAudio';
import Button3D from '../../src/components/Button3D';
import Chip from '../../src/components/Chip';
import { spacing, font, radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

function BeatIndicator() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const beatsPerMeasure = usePractice((s) => s.beatsPerMeasure);
  const currentBeat = usePractice((s) => s.currentBeat);
  const isPlaying = usePractice((s) => s.isPlaying);
  const accentFirst = usePractice((s) => s.accentFirst);

  return (
    <View style={styles.beatRow}>
      {Array.from({ length: beatsPerMeasure }).map((_, i) => {
        const active = isPlaying && i === currentBeat;
        const isAccent = accentFirst && i === 0;
        return (
          <View
            key={i}
            style={[
              styles.beatDot,
              isAccent && styles.beatDotAccent,
              active && {
                backgroundColor: c.primary,
                borderColor: c.primaryDark,
                transform: [{ scale: 1.15 }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export default function MetronomeScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const bpm = usePractice((s) => s.bpm);
  const isPlaying = usePractice((s) => s.isPlaying);
  const beatsPerMeasure = usePractice((s) => s.beatsPerMeasure);
  const accentFirst = usePractice((s) => s.accentFirst);
  const hapticsEnabled = usePractice((s) => s.hapticsEnabled);
  const toggleHaptics = usePractice((s) => s.toggleHaptics);
  const setBpm = usePractice((s) => s.setBpm);
  const nudgeBpm = usePractice((s) => s.nudgeBpm);
  const setBeatsPerMeasure = usePractice((s) => s.setBeatsPerMeasure);
  const toggleAccentFirst = usePractice((s) => s.toggleAccentFirst);
  const togglePlay = usePractice((s) => s.togglePlay);
  const tapTempo = usePractice((s) => s.tapTempo);

  const timerSeconds = usePractice((s) => s.timerSeconds);
  const timerRunning = usePractice((s) => s.timerRunning);
  const toggleTimer = usePractice((s) => s.toggleTimer);
  const resetTimer = usePractice((s) => s.resetTimer);

  const [audioNote, setAudioNote] = useState(null);

  // 4 clicks, not 1 — the failure worth catching is a first click then silence
  const testClick = async () => {
    setAudioNote('Playing 4 clicks…');
    await setPlaybackAudioMode();
    fireClick('accent');
    for (const kind of ['tick', 'tick', 'tick']) {
      await new Promise((r) => setTimeout(r, 500));
      fireClick(kind);
    }
    const err = getAudioError();
    const failed = getFailureCount();
    if (err) setAudioNote(err);
    else if (failed) setAudioNote(`${failed} of 4 clicks failed to play.`);
    else setAudioNote('Played 4 clicks — 1 accent then 3 beats. Heard all four?');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Metronome</Text>

        {/* BPM display + steppers */}
        <View style={styles.bpmCard}>
          <View style={styles.bpmRow}>
            <Button3D label="–5" onPress={() => nudgeBpm(-5)} style={styles.stepBtn} />
            <Button3D label="–1" onPress={() => nudgeBpm(-1)} style={styles.stepBtn} />
            <View style={styles.bpmDisplay}>
              <Text style={styles.bpmValue}>{bpm}</Text>
              <Text style={styles.bpmUnit}>BPM</Text>
            </View>
            <Button3D label="+1" onPress={() => nudgeBpm(1)} style={styles.stepBtn} />
            <Button3D label="+5" onPress={() => nudgeBpm(5)} style={styles.stepBtn} />
          </View>
          <Text style={styles.rangeHint}>{BPM_RANGE.min}–{BPM_RANGE.max} BPM</Text>
        </View>

        <BeatIndicator />

        <View style={styles.rowGap}>
          <Button3D
            label={isPlaying ? 'Stop' : 'Start'}
            active={isPlaying}
            onPress={togglePlay}
            style={styles.playBtn}
          />
          <Button3D
            label="Tap Tempo"
            color={c.accent}
            darkColor={c.accentDark}
            onColor={c.onAccent}
            onPress={tapTempo}
            style={styles.tapBtn}
          />
        </View>

        <Button3D label="Test Click" onPress={testClick} style={styles.testBtn} />
        {audioNote ? <Text style={styles.audioNote}>{audioNote}</Text> : null}

        {/* Beats per measure */}
        <Text style={styles.sectionLabel}>Beats per measure</Text>
        <View style={styles.chipRow}>
          {BEATS_OPTIONS.map((n) => (
            <Chip key={n} label={String(n)} active={beatsPerMeasure === n} onPress={() => setBeatsPerMeasure(n)} />
          ))}
        </View>

        {/* Accent first beat */}
        <Text style={styles.sectionLabel}>Accent first beat</Text>
        <View style={styles.rowGap}>
          <Button3D label="On" active={accentFirst} onPress={() => !accentFirst && toggleAccentFirst()} style={styles.halfBtn} />
          <Button3D label="Off" active={!accentFirst} onPress={() => accentFirst && toggleAccentFirst()} style={styles.halfBtn} />
        </View>

        {/* Haptics */}
        <Text style={styles.sectionLabel}>Haptic buzz</Text>
        <View style={styles.rowGap}>
          <Button3D label="On" active={hapticsEnabled} onPress={() => !hapticsEnabled && toggleHaptics()} style={styles.halfBtn} />
          <Button3D label="Off" active={!hapticsEnabled} onPress={() => hapticsEnabled && toggleHaptics()} style={styles.halfBtn} />
        </View>

        {/* Practice timer */}
        <Text style={styles.sectionLabel}>Practice Timer</Text>
        <View style={styles.timerCard}>
          <Text style={styles.timerValue}>{formatTimer(timerSeconds)}</Text>
          <View style={styles.rowGap}>
            <Button3D
              label={timerRunning ? 'Pause' : 'Start'}
              active={timerRunning}
              color={c.accent}
              darkColor={c.accentDark}
              onColor={c.onAccent}
              onPress={toggleTimer}
              style={styles.halfBtn}
            />
            <Button3D label="Reset" onPress={resetTimer} style={styles.halfBtn} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { color: c.text, fontSize: font.size.xxl, fontWeight: font.weight.bold, marginBottom: spacing.lg },
  bpmCard: {
    backgroundColor: c.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  bpmRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  stepBtn: { paddingHorizontal: spacing.md },
  bpmDisplay: { alignItems: 'center', marginHorizontal: spacing.md, minWidth: 90 },
  bpmValue: { color: c.primary, fontSize: 48, fontWeight: font.weight.bold },
  bpmUnit: { color: c.muted, fontSize: font.size.xs, letterSpacing: 2, fontWeight: font.weight.bold },
  rangeHint: { color: c.muted, fontSize: font.size.xs, marginTop: spacing.sm },
  beatRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, gap: spacing.md },
  beatDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  beatDotAccent: { borderColor: c.primaryDark },
  rowGap: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  testBtn: { marginTop: spacing.md },
  audioNote: {
    color: c.muted,
    fontSize: font.size.xs,
    lineHeight: 18,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  playBtn: { flex: 2 },
  tapBtn: { flex: 1 },
  halfBtn: { flex: 1 },
  sectionLabel: {
    color: c.muted,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  timerCard: {
    backgroundColor: c.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  timerValue: { color: c.text, fontSize: 44, fontWeight: font.weight.bold, fontVariant: ['tabular-nums'] },
});

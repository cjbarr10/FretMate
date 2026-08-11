import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTuner } from '../../src/store/useTuner';
import { useSettings } from '../../src/store/useSettings';
import useTunerEngine from '../../src/hooks/useTunerEngine';
import { TUNER_PRESETS, TUNINGS, noteOctaveToFreq } from '../../src/lib/notes';
import { matchToTuning } from '../../src/lib/pitchDetection';
import Button3D from '../../src/components/Button3D';
import { spacing, font, radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

const TUNING_OPTIONS = ['standard', 'dropD', 'openG'];
const IN_TUNE_THRESHOLD = 5; // cents
const NEEDLE_MAX_DEG = 45;
const NEEDLE_MAX_CENTS = 50;

function Dial({ cents, noteName, inTune, hasReading }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const clamped = Math.max(-NEEDLE_MAX_CENTS, Math.min(NEEDLE_MAX_CENTS, cents ?? 0));
  const angle = hasReading ? (clamped / NEEDLE_MAX_CENTS) * NEEDLE_MAX_DEG : 0;

  return (
    <View style={styles.dialWrap}>
      <View style={[styles.dial, inTune && styles.dialInTune]}>
        {[-45, -22.5, 0, 22.5, 45].map((deg) => (
          <View
            key={deg}
            style={[
              styles.tick,
              deg === 0 && styles.tickCenter,
              { transform: [{ rotate: `${deg}deg` }] },
            ]}
          />
        ))}

        <View style={[styles.needle, { transform: [{ rotate: `${angle}deg` }] }]} />

        <View style={[styles.centerDisc, inTune && styles.centerDiscInTune]}>
          <Text style={[styles.noteText, inTune && styles.noteTextInTune]}>
            {hasReading ? noteName : '–'}
          </Text>
        </View>
      </View>

      <Text style={[styles.inTuneLabel, inTune && styles.inTuneLabelActive]}>
        {inTune ? 'IN TUNE' : hasReading ? (cents > 0 ? 'SHARP' : 'FLAT') : 'LISTENING…'}
      </Text>
    </View>
  );
}

function StringButton({ label, active, glow, onPress, thickness }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <Button3D
      onPress={onPress}
      active={active}
      color={c.primary}
      darkColor={c.primaryDark}
      style={[styles.stringBtn, glow && styles.stringBtnGlow]}
    >
      <View style={[styles.stringLine, { height: thickness, backgroundColor: active ? c.onPrimary : c.muted }]} />
      <Text style={[styles.stringLabel, active && { color: c.onPrimary }]}>{label}</Text>
    </Button3D>
  );
}

export default function TunerScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const listening = useTuner((s) => s.listening);
  const frequency = useTuner((s) => s.frequency);
  const note = useTuner((s) => s.note);
  const selectedString = useTuner((s) => s.selectedString);
  const error = useTuner((s) => s.error);
  const debugInfo = useTuner((s) => s.debugInfo);
  const setSelectedString = useTuner((s) => s.setSelectedString);

  const tuning = useSettings((s) => s.tuning);
  const a4 = useSettings((s) => s.a4);
  const setTuning = useSettings((s) => s.setTuning);

  const { start, stop } = useTunerEngine();

  const preset = TUNER_PRESETS[tuning] || TUNER_PRESETS.standard;
  const tuningNames = (TUNINGS[tuning] || TUNINGS.standard).names;

  const targetFreqs = useMemo(
    () => preset.notes.map((n) => noteOctaveToFreq(n, a4)),
    [preset, a4]
  );

  // octave-aware: a doubled/halved reading would otherwise match an unrelated string
  const match = useMemo(() => {
    if (!frequency) return null;
    if (selectedString != null) {
      // a chosen string is never reassigned; only folded to its best octave
      return { ...matchToTuning(frequency, [targetFreqs[selectedString]]), index: selectedString };
    }
    return matchToTuning(frequency, targetFreqs);
  }, [frequency, targetFreqs, selectedString]);

  const activeIndex = match ? match.index : selectedString;
  const cents = match ? match.cents : null;
  const hasReading = frequency != null && cents != null;
  const inTune = hasReading && Math.abs(cents) <= IN_TUNE_THRESHOLD;

  const toggleListening = () => {
    if (listening) stop();
    else start();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Tuner</Text>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Dial
          cents={cents}
          noteName={note ? `${note.name}${note.octave}` : '–'}
          inTune={inTune}
          hasReading={hasReading && listening}
        />

        <Button3D
          label={listening ? 'Stop' : 'Start'}
          active={listening}
          color={c.accent}
          darkColor={c.accentDark}
          onColor={c.onAccent}
          onPress={toggleListening}
          style={styles.startBtn}
        />

        {listening && debugInfo ? (
          <Text style={styles.debugText}>
            mic level: {debugInfo.rms.toFixed(4)} · samples: {debugInfo.sampleCount} @ {debugInfo.sampleRate}Hz
          </Text>
        ) : null}

        <Text style={styles.sectionLabel}>Strings</Text>
        <View style={styles.stringRow}>
          {tuningNames.map((label, i) => (
            <StringButton
              key={i}
              label={label}
              active={selectedString === i}
              glow={selectedString == null && activeIndex === i && listening}
              thickness={2 + (5 - i) * 1.1}
              onPress={() => setSelectedString(selectedString === i ? null : i)}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Preset</Text>
        <View style={styles.rowGap}>
          {TUNING_OPTIONS.map((key) => (
            <Button3D
              key={key}
              label={TUNINGS[key].label}
              active={tuning === key}
              onPress={() => setTuning(key)}
              style={styles.presetBtn}
            />
          ))}
        </View>

        {Platform.OS !== 'ios' && (
          <Text style={styles.platformNote}>
            Live tuning currently works on iOS. Android support needs a different audio module and is next up.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, alignItems: 'stretch' },
  title: { color: c.text, fontSize: font.size.xxl, fontWeight: font.weight.bold, marginBottom: spacing.md },
  errorCard: {
    backgroundColor: c.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.danger,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { color: c.text, fontSize: font.size.sm, lineHeight: 20 },

  dialWrap: { alignItems: 'center', marginTop: spacing.md },
  dial: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: c.card,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialInTune: { borderColor: c.accent },
  tick: {
    position: 'absolute',
    top: 8,
    width: 2,
    height: 14,
    backgroundColor: c.border,
  },
  tickCenter: { backgroundColor: c.primary, height: 18 },
  needle: {
    position: 'absolute',
    bottom: 108,
    width: 3,
    height: 90,
    borderRadius: 2,
    backgroundColor: c.primary,
  },
  centerDisc: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: c.bg,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDiscInTune: { borderColor: c.accent, shadowColor: c.accent, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  noteText: { color: c.text, fontSize: 30, fontWeight: font.weight.bold },
  noteTextInTune: { color: c.accent },
  inTuneLabel: {
    marginTop: spacing.md,
    color: c.muted,
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
    letterSpacing: 2,
  },
  inTuneLabelActive: { color: c.accent },

  startBtn: { marginTop: spacing.xl },
  debugText: {
    color: c.muted,
    fontSize: font.size.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },

  sectionLabel: {
    color: c.muted,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  stringRow: { flexDirection: 'row', gap: spacing.xs },
  stringBtn: { flex: 1, paddingVertical: spacing.sm },
  stringBtnGlow: { shadowColor: c.primary, shadowOpacity: 0.7, shadowRadius: 8, elevation: 6 },
  stringLine: { width: '60%', borderRadius: 2, marginBottom: spacing.xs },
  stringLabel: { color: c.text, fontWeight: font.weight.bold, fontSize: font.size.sm },

  rowGap: { flexDirection: 'row', gap: spacing.sm },
  presetBtn: { flex: 1 },

  platformNote: {
    color: c.muted,
    fontSize: font.size.xs,
    lineHeight: 18,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});

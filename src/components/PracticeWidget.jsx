import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePractice, formatTimer } from '../store/usePractice';
import { radius, spacing, font } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// Clears the 66pt tab bar with a small gap; the bar grows by the bottom inset
// under edge-to-edge, so this has to ride up by the same amount.
const TAB_BAR_CLEARANCE = 78;

export default function PracticeWidget() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const bpm = usePractice((s) => s.bpm);
  const isPlaying = usePractice((s) => s.isPlaying);
  const currentBeat = usePractice((s) => s.currentBeat);
  const beatsPerMeasure = usePractice((s) => s.beatsPerMeasure);
  const togglePlay = usePractice((s) => s.togglePlay);

  const timerSeconds = usePractice((s) => s.timerSeconds);
  const timerRunning = usePractice((s) => s.timerRunning);
  const toggleTimer = usePractice((s) => s.toggleTimer);

  // Hide on the Metronome tab itself — its full controls are already there.
  if (pathname === '/metronome') return null;

  const anyActive = isPlaying || timerRunning || timerSeconds > 0;
  if (!anyActive) return null;

  return (
    <Pressable
      style={[styles.wrap, { bottom: TAB_BAR_CLEARANCE + insets.bottom }]}
      onPress={() => router.push('/metronome')}
    >
      {/* Metronome side */}
      <View style={styles.section}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          style={styles.iconBtn}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={c.onPrimary} />
        </Pressable>
        <Text style={styles.bpmText}>{bpm}</Text>
        <View style={styles.dots}>
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: isPlaying && i === currentBeat ? c.primary : c.border,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Timer side */}
      <View style={styles.section}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            toggleTimer();
          }}
          style={[styles.iconBtn, { backgroundColor: c.accent }]}
        >
          <Ionicons name={timerRunning ? 'pause' : 'play'} size={16} color={c.onAccent} />
        </Pressable>
        <Text style={styles.timerText}>{formatTimer(timerSeconds)}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (c) => StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: c.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    // a 40%-black shadow reads as a smudge on a pale panel
    shadowColor: '#000',
    shadowOpacity: c.mode === 'light' ? 0.16 : 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  section: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  divider: { width: 1, height: 24, backgroundColor: c.border, marginHorizontal: spacing.sm },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  bpmText: { color: c.text, fontWeight: font.weight.bold, fontSize: font.size.md, marginRight: spacing.sm },
  timerText: { color: c.text, fontWeight: font.weight.bold, fontSize: font.size.md },
  dots: { flexDirection: 'row' },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 2 },
});

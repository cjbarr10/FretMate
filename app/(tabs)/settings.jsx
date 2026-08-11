import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../src/store/useSettings';
import { TUNINGS } from '../../src/lib/notes';
import Button3D from '../../src/components/Button3D';
import { spacing, font } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

const FRET_OPTIONS = [15, 18, 22];
const TUNING_OPTIONS = ['standard', 'dropD', 'openG'];

function Section({ title, children }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { frets, tuning, themeMode, setFrets, setTuning, setThemeMode } = useSettings();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <Section title="Tuning">
          <View style={styles.rowWrap}>
            {TUNING_OPTIONS.map((key) => (
              <Button3D
                key={key}
                label={TUNINGS[key].label}
                active={tuning === key}
                onPress={() => setTuning(key)}
                style={styles.cellBtn}
              />
            ))}
          </View>
        </Section>

        <Section title="Frets displayed">
          <View style={styles.rowWrap}>
            {FRET_OPTIONS.map((n) => (
              <Button3D
                key={n}
                label={String(n)}
                active={frets === n}
                onPress={() => setFrets(n)}
                style={styles.cellBtn}
              />
            ))}
          </View>
        </Section>

        <Section title="Theme">
          <View style={styles.rowWrap}>
            <Button3D
              label="Dark"
              active={themeMode === 'dark'}
              onPress={() => setThemeMode('dark')}
              style={styles.halfBtn}
            />
            <Button3D
              label="Light"
              active={themeMode === 'light'}
              onPress={() => setThemeMode('light')}
              style={styles.halfBtn}
            />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { color: c.text, fontSize: font.size.xxl, fontWeight: font.weight.bold, marginBottom: spacing.md },
  section: { marginTop: spacing.lg },
  sectionLabel: {
    color: c.muted,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  rowWrap: { flexDirection: 'row', gap: spacing.sm },
  cellBtn: { flex: 1 },
  halfBtn: { flex: 1 },
});

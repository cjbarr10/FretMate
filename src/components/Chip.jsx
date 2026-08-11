import { useMemo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { radius, font, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// Compact selectable pill. `accent` sets the active fill colour; it defaults
// to null and resolves from the theme at render time.
export default function Chip({ label, active = false, onPress, accent = null, onAccent = null, style }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const fill = accent ?? c.primary;
  const ink = onAccent ?? c.onPrimary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? fill : c.card,
          borderColor: active ? fill : c.border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: active ? ink : c.text }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    chip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      marginRight: spacing.sm,
      minWidth: 42,
      alignItems: 'center',
    },
    label: {
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
    },
  });

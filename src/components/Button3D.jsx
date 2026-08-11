import { useState, useMemo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { radius, font, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// 3D press effect: a thick bottom border that collapses when held. Colour props
// default to null and resolve from the theme, since the palette isn't known in the signature.
export default function Button3D({
  label,
  onPress,
  active = false,
  color = null,
  darkColor = null,
  onColor = null,
  children,
  style,
  textStyle,
}) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [pressed, setPressed] = useState(false);

  const fill = color ?? c.primary;
  const edge = darkColor ?? c.primaryDark;
  const ink = onColor ?? c.onPrimary;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.btn,
        {
          backgroundColor: active ? fill : c.card,
          borderBottomColor: active ? edge : c.border,
          borderBottomWidth: pressed ? 2 : 6,
          transform: [{ translateY: pressed ? 4 : 0 }],
        },
        style,
      ]}
    >
      {children != null ? (
        children
      ) : (
        <Text style={[styles.label, { color: active ? ink : c.text }, textStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    btn: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: font.size.md,
      fontWeight: font.weight.bold,
    },
  });

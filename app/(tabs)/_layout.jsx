import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/useTheme';

export const TAB_BAR_HEIGHT = 66;

// Live tuning needs raw PCM capture, which only the iOS recorder exposes — so
// the tab is hidden rather than shipped as a tab that only shows an error.
const TUNER_ENABLED = Platform.OS === 'ios';

export default function TabsLayout() {
  const c = useTheme();
  // Android 15+ draws edge-to-edge, so the bar would otherwise sit under the
  // gesture pill / nav buttons. Grow it by the inset instead of moving it up.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="chords"
        options={{
          title: 'Chords',
          tabBarIcon: ({ color, size }) => <Ionicons name="hand-left-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scales"
        options={{
          title: 'Scales',
          tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tuner"
        options={{
          href: TUNER_ENABLED ? undefined : null,
          title: 'Tuner',
          tabBarIcon: ({ color, size }) => <Ionicons name="radio-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="metronome"
        options={{
          title: 'Metronome',
          tabBarIcon: ({ color, size }) => <Ionicons name="timer-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

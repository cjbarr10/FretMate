import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/useTheme';

export default function TabsLayout() {
  const c = useTheme();

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
          height: 66,
          paddingBottom: 8,
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

import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/useTheme';
import usePracticeEngine from '../src/hooks/usePracticeEngine';
import useHydrated from '../src/hooks/useHydrated';
import PracticeWidget from '../src/components/PracticeWidget';

export default function RootLayout() {
  const c = useTheme();
  const hydrated = useHydrated();

  // Mounted once at the root (not inside a tab screen) so the metronome and
  // practice timer keep running no matter which tab is currently active.
  usePracticeEngine();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaProvider>
        <StatusBar style={c.mode === 'light' ? 'dark' : 'light'} />
        {hydrated ? (
          <>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: c.bg },
              }}
            >
              <Stack.Screen name="(tabs)" />
            </Stack>
            <PracticeWidget />
          </>
        ) : (
          // preferences still loading — hold a plain background rather than flashing defaults
          <View style={{ flex: 1, backgroundColor: c.bg }} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

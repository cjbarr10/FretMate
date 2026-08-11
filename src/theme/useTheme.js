import { useSettings } from '../store/useSettings';
import { PALETTES } from './tokens';

// The active palette. Read via the store so a mode change re-renders (StyleSheet bakes values in at import).
export function useTheme() {
  const mode = useSettings((s) => s.themeMode);
  return PALETTES[mode] || PALETTES.dark;
}

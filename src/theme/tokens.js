// Blackface theme. Both palettes expose the same keys so components read one
// shape; screens call useTheme() rather than importing a palette directly.

const dark = {
  mode: 'dark',

  bg: '#0B0C0E',
  card: '#15171B',
  border: '#282C33',

  primary: '#E4E9EF', // chrome — root notes, active controls
  primaryDark: '#A7B0BB', // the 3D button's bottom edge

  accent: '#2F6BFF', // jewel lamp — scale notes, secondary actions
  accentDark: '#1E4BC4',

  text: '#F1F5F9',
  muted: '#7C8794',

  danger: '#EF4444',

  // ink for text sitting on top of a filled primary/accent surface
  onPrimary: '#0B0C0E',
  onAccent: '#EAF0FF',
};

const light = {
  mode: 'light',

  bg: '#ECEEF1',
  card: '#FFFFFF',
  border: '#C9D0D8',

  primary: '#2B3440', // chrome reads as dark slate against a light panel
  primaryDark: '#161C24',

  accent: '#1D4ED8',
  accentDark: '#1436A4',

  text: '#0B0C0E',
  muted: '#5B6673',

  danger: '#DC2626',

  onPrimary: '#F5F7FA',
  onAccent: '#EAF0FF',
};

export const PALETTES = { dark, light };

// Fallback for anything that needs colours outside a component (and so can't
// call the hook). Prefer useTheme() everywhere you can.
export const colors = dark;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const font = {
  size: { xs: 11, sm: 13, md: 15, lg: 18, xl: 24, xxl: 32 },
  weight: { regular: '400', medium: '600', bold: '700' },
};

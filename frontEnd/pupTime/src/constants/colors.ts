import { Appearance, ColorSchemeName } from 'react-native';

export type AppColors = {
  background: string;
  surface: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryText: string;
  text: string;
  secondaryText: string;
  border: string;
  error: string;
  divider: string;
  buttonDanger?: string;
  glassBackground?: string;
};

const lightColors: AppColors = {
  background: '#F9FAF9', // Very soft greenish-white
  surface: '#FFFFFF',
  primary: '#10B981', // Emerald green
  primaryLight: '#D1FAE5', // Soft green background for chips
  primaryDark: '#047857', // Dark green for contrast
  primaryText: '#FFFFFF',
  text: '#111827',
  secondaryText: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  divider: '#E5E7EB',
  buttonDanger: '#EF4444',
  glassBackground: 'rgba(255, 255, 255, 0.85)',
};

const darkColors: AppColors = {
  background: '#0B110D', // Very dark greenish-black
  surface: '#15201A', // Slightly lighter dark green surface
  primary: '#34D399', // Bright emerald for dark mode
  primaryLight: '#064E3B', // Dark green chip background
  primaryDark: '#059669', // Muted green
  primaryText: '#0B110D',
  text: '#F9FAFB',
  secondaryText: '#9CA3AF',
  border: '#273F32',
  error: '#F87171',
  divider: '#273F32',
  buttonDanger: '#F87171',
  glassBackground: 'rgba(21, 32, 26, 0.85)',
};

export const getColors = (colorScheme?: ColorSchemeName): AppColors => {
  const scheme = colorScheme ?? Appearance.getColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
};

export const colors = getColors();

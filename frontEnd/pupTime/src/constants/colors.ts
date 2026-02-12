import { Appearance, ColorSchemeName } from 'react-native';

export type AppColors = {
  background: string;
  surface: string;
  primary: string;
  primaryText: string;
  text: string;
  secondaryText: string;
  border: string;
  error: string;
  divider: string;
  buttonDanger?: string;
};

const lightColors: AppColors = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  primary: '#2563EB',
  primaryText: '#FFFFFF',
  text: '#111827',
  secondaryText: '#6B7280',
  border: '#D1D5DB',
  error: '#EF4444',
  divider: '#D1D5DB',
  buttonDanger: '#ff6b6b',
};

const darkColors: AppColors = {
  background: '#020617',
  surface: '#020617',
  primary: '#3B82F6',
  primaryText: '#FFFFFF',
  text: '#F9FAFB',
  secondaryText: '#9CA3AF',
  border: '#4B5563',
  error: '#F97373',
  divider: '#4B5563',
  buttonDanger: '#f97373',
};

export const getColors = (colorScheme?: ColorSchemeName): AppColors => {
  const scheme = colorScheme ?? Appearance.getColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
};

export const colors = getColors();

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
  fontSize?: string;
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

export type ColorSchemeOption = 'emerald' | 'ocean' | 'royal' | 'sunset' | 'rose';

export const COLOR_SCHEME_PRESETS: Record<ColorSchemeOption, {
  name: string;
  light: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
  };
  dark: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
  };
}> = {
  emerald: {
    name: 'Emerald Green',
    light: {
      primary: '#10B981',
      primaryLight: '#D1FAE5',
      primaryDark: '#047857',
    },
    dark: {
      primary: '#34D399',
      primaryLight: '#064E3B',
      primaryDark: '#059669',
    },
  },
  ocean: {
    name: 'Ocean Blue',
    light: {
      primary: '#3B82F6',
      primaryLight: '#DBEAFE',
      primaryDark: '#1D4ED8',
    },
    dark: {
      primary: '#60A5FA',
      primaryLight: '#1E3A8A',
      primaryDark: '#2563EB',
    },
  },
  royal: {
    name: 'Royal Purple',
    light: {
      primary: '#8B5CF6',
      primaryLight: '#EDE9FE',
      primaryDark: '#6D28D9',
    },
    dark: {
      primary: '#A78BFA',
      primaryLight: '#4C1D95',
      primaryDark: '#7C3AED',
    },
  },
  sunset: {
    name: 'Sunset Orange',
    light: {
      primary: '#F97316',
      primaryLight: '#FFEDD5',
      primaryDark: '#C2410C',
    },
    dark: {
      primary: '#FBBF24',
      primaryLight: '#78350F',
      primaryDark: '#D97706',
    },
  },
  rose: {
    name: 'Pink Rose',
    light: {
      primary: '#EC4899',
      primaryLight: '#FCE7F3',
      primaryDark: '#BE185D',
    },
    dark: {
      primary: '#F472B6',
      primaryLight: '#831843',
      primaryDark: '#DB2777',
    },
  },
};

export const getColors = (colorScheme?: ColorSchemeName, schemeOption?: ColorSchemeOption): AppColors => {
  const scheme = colorScheme ?? Appearance.getColorScheme();
  const isDark = scheme === 'dark';
  const baseColors = isDark ? darkColors : lightColors;
  const preset = COLOR_SCHEME_PRESETS[schemeOption || 'emerald'] || COLOR_SCHEME_PRESETS.emerald;
  const customPrimary = isDark ? preset.dark : preset.light;

  return {
    ...baseColors,
    primary: customPrimary.primary,
    primaryLight: customPrimary.primaryLight,
    primaryDark: customPrimary.primaryDark,
  };
};

export const colors = getColors();

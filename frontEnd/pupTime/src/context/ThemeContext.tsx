import React, { createContext, useState, useEffect, useMemo } from 'react';
import { Appearance, ColorSchemeName, Platform, UIManager, LayoutAnimation } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, AppColors, ColorSchemeOption } from '../constants/colors';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const THEME_MODE_KEY = 'theme_mode_pref';
const COLOR_SCHEME_KEY = 'color_scheme_pref';
const FONT_SIZE_KEY = 'font_size_pref';

export const FONT_SCALE_MULTIPLIERS = {
  small: 0.85,
  medium: 1.0,
  large: 1.15,
};

export interface ThemeContextType {
  themeMode: 'light' | 'dark' | 'system';
  colorScheme: ColorSchemeOption;
  fontSize: 'small' | 'medium' | 'large';
  theme: ColorSchemeName;
  colors: AppColors;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setColorScheme: (scheme: ColorSchemeOption) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>('system');
  const [colorScheme, setColorSchemeState] = useState<ColorSchemeOption>('emerald');
  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large'>('medium');
  const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(Appearance.getColorScheme() || 'light');

  // Load persisted preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const storedThemeMode = await AsyncStorage.getItem(THEME_MODE_KEY);
        const storedColorScheme = await AsyncStorage.getItem(COLOR_SCHEME_KEY);
        const storedFontSize = await AsyncStorage.getItem(FONT_SIZE_KEY);

        if (storedThemeMode) {
          setThemeModeState(storedThemeMode as 'light' | 'dark' | 'system');
        }
        if (storedColorScheme) {
          setColorSchemeState(storedColorScheme as ColorSchemeOption);
        }
        if (storedFontSize) {
          const size = storedFontSize as 'small' | 'medium' | 'large';
          setFontSizeState(size);
          (globalThis as any).fontScale = FONT_SCALE_MULTIPLIERS[size] || 1.0;
        }
      } catch (error) {
        console.error('Error loading theme preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme: newColorScheme }) => {
      setSystemTheme(newColorScheme || 'light');
    });

    return () => subscription.remove();
  }, []);

  // Determine active theme ('light' | 'dark')
  const activeTheme: ColorSchemeName = themeMode === 'system' ? (systemTheme || 'light') : themeMode;

  // Compute active colors
  const activeColors = useMemo(() => {
    const baseColors = getColors(activeTheme, colorScheme);
    return {
      ...baseColors,
      fontSize,
    };
  }, [activeTheme, colorScheme, fontSize]);

  // Set theme mode and persist it
  const setThemeMode = async (mode: 'light' | 'dark' | 'system') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  // Set color scheme and persist it
  const setColorScheme = async (scheme: ColorSchemeOption) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setColorSchemeState(scheme);
    try {
      await AsyncStorage.setItem(COLOR_SCHEME_KEY, scheme);
    } catch (error) {
      console.error('Error saving color scheme:', error);
    }
  };

  // Set font size and persist it
  const setFontSize = async (size: 'small' | 'medium' | 'large') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFontSizeState(size);
    (globalThis as any).fontScale = FONT_SCALE_MULTIPLIERS[size] || 1.0;
    try {
      await AsyncStorage.setItem(FONT_SIZE_KEY, size);
    } catch (error) {
      console.error('Error saving font size:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        colorScheme,
        fontSize,
        theme: activeTheme,
        colors: activeColors,
        setThemeMode,
        setColorScheme,
        setFontSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

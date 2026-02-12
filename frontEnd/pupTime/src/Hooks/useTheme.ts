import { useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { getColors, AppColors } from '../constants/colors';

export type UseThemeResult = {
  theme: ColorSchemeName | null;
  colors: AppColors;
};

const useTheme = (): UseThemeResult => {
  const [theme, setTheme] = useState<any>(
    Appearance.getColorScheme(),
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  const colors = getColors(theme);

  return { theme, colors };
};

export default useTheme;

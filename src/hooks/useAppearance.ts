import { useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

const APPEARANCE_KEY = '@appearance';

type Appearance = 'light' | 'dark' | 'system';

export function useAppearance() {
  const systemColorScheme = useColorScheme();
  const [appearance, setAppearanceState] = useState<Appearance>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(APPEARANCE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setAppearanceState(stored);
        }
      })
      .finally(() => setIsReady(true));
  }, []);

  const setAppearance = useCallback(async (value: Appearance) => {
    setAppearanceState(value);
    await AsyncStorage.setItem(APPEARANCE_KEY, value);
  }, []);

  const isDark =
    appearance === 'system'
      ? systemColorScheme === 'dark'
      : appearance === 'dark';

  const theme = isDark
    ? colors.dark
    : {
        background: colors.background,
        foreground: colors.foreground,
        card: colors.card,
        border: colors.border,
        muted: colors.muted,
        mutedForeground: colors.mutedForeground,
      };

  return { appearance, setAppearance, isDark, theme, isReady };
}

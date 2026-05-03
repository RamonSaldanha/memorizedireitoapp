import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useAppearanceStore } from '../stores/appearanceStore';

export function useAppearance() {
  const systemColorScheme = useColorScheme();
  const systemIsDark = systemColorScheme === 'dark';

  const initialized = useAppearanceStore((s) => s.initialized);
  const initialize = useAppearanceStore((s) => s.initialize);
  const setSystemIsDark = useAppearanceStore((s) => s.setSystemIsDark);

  useEffect(() => {
    if (!initialized) {
      initialize(systemIsDark);
    }
  }, []);

  useEffect(() => {
    if (initialized) {
      setSystemIsDark(systemIsDark);
    }
  }, [systemIsDark, initialized]);

  const appearance = useAppearanceStore((s) => s.appearance);
  const isDark = useAppearanceStore((s) => s.isDark);
  const theme = useAppearanceStore((s) => s.theme);
  const setAppearance = useAppearanceStore((s) => s.setAppearance);

  return { appearance, setAppearance, isDark, theme, isReady: initialized };
}

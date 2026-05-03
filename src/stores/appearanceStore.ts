import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

const APPEARANCE_KEY = '@appearance';
export type Appearance = 'light' | 'dark' | 'system';

export type ThemeTokens = {
  background: string;
  foreground: string;
  card: string;
  border: string;
  muted: string;
  mutedForeground: string;
};

function computeTheme(appearance: Appearance, systemIsDark: boolean) {
  const isDark = appearance === 'system' ? systemIsDark : appearance === 'dark';
  return {
    isDark,
    theme: isDark
      ? { ...colors.dark }
      : {
          background: colors.background,
          foreground: colors.foreground,
          card: colors.card,
          border: colors.border,
          muted: colors.muted,
          mutedForeground: colors.mutedForeground,
        },
  };
}

type AppearanceState = {
  appearance: Appearance;
  systemIsDark: boolean;
  isDark: boolean;
  theme: ThemeTokens;
  initialized: boolean;
  initialize: (systemIsDark: boolean) => Promise<void>;
  setAppearance: (value: Appearance) => Promise<void>;
  setSystemIsDark: (systemIsDark: boolean) => void;
};

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  appearance: 'system',
  systemIsDark: false,
  isDark: false,
  theme: {
    background: colors.background,
    foreground: colors.foreground,
    card: colors.card,
    border: colors.border,
    muted: colors.muted,
    mutedForeground: colors.mutedForeground,
  },
  initialized: false,

  initialize: async (systemIsDark: boolean) => {
    const stored = await AsyncStorage.getItem(APPEARANCE_KEY);
    const appearance =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? (stored as Appearance)
        : 'system';
    const { isDark, theme } = computeTheme(appearance, systemIsDark);
    set({ appearance, systemIsDark, isDark, theme, initialized: true });
  },

  setAppearance: async (value: Appearance) => {
    const { systemIsDark } = get();
    const { isDark, theme } = computeTheme(value, systemIsDark);
    set({ appearance: value, isDark, theme });
    await AsyncStorage.setItem(APPEARANCE_KEY, value);
  },

  setSystemIsDark: (systemIsDark: boolean) => {
    const { appearance } = get();
    const { isDark, theme } = computeTheme(appearance, systemIsDark);
    set({ systemIsDark, isDark, theme });
  },
}));

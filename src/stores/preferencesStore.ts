import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERENCES_KEY = '@preferences';

type PreferencesState = {
  successSoundEnabled: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  setSuccessSoundEnabled: (value: boolean) => Promise<void>;
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  successSoundEnabled: true,
  initialized: false,

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          successSoundEnabled: parsed.successSoundEnabled ?? true,
          initialized: true,
        });
      } else {
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },

  setSuccessSoundEnabled: async (value: boolean) => {
    set({ successSoundEnabled: value });
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      const current = stored ? JSON.parse(stored) : {};
      await AsyncStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({ ...current, successSoundEnabled: value }),
      );
    } catch {
      // silently fail
    }
  },
}));

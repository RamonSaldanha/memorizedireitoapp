import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY } from '../api/client';
import { profileApi } from '../api/profile';
import type { UserData } from '../api/auth';
import { useUserStore } from './userStore';

// Onboarding ainda por fazer neste aparelho. Fica salvo para o onboarding
// voltar se o app for fechado no meio, e é lido junto com o token para o mapa
// não piscar antes dele.
const ONBOARDING_PENDING_KEY = '@onboarding_pending';

type AuthState = {
  token: string | null;
  user: UserData | null;
  isLoading: boolean;
  onboardingPending: boolean;
  setToken: (token: string) => Promise<void>;
  setUser: (user: UserData) => void;
  setOnboardingPending: (pending: boolean) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
};

async function persistOnboardingPending(pending: boolean) {
  try {
    if (pending) await AsyncStorage.setItem(ONBOARDING_PENDING_KEY, '1');
    else await AsyncStorage.removeItem(ONBOARDING_PENDING_KEY);
  } catch {
    // Sem storage: vale só até fechar o app.
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  onboardingPending: false,

  setToken: async (token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token });
  },

  setUser: (user) => set({ user }),

  setOnboardingPending: async (pending) => {
    set({ onboardingPending: pending });
    await persistOnboardingPending(pending);
  },

  logout: async () => {
    try {
      await profileApi.logout();
    } catch {
      // Ignora erro de rede — o token será apagado localmente de qualquer forma
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await persistOnboardingPending(false);
    useUserStore.getState().reset();
    set({ token: null, user: null, onboardingPending: false });
  },

  initialize: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    let onboardingPending = false;
    try {
      onboardingPending = !!token && (await AsyncStorage.getItem(ONBOARDING_PENDING_KEY)) === '1';
    } catch {
      onboardingPending = false;
    }
    set({ token: token ?? null, onboardingPending, isLoading: false });
  },
}));

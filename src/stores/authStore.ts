import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from '../api/client';
import { profileApi } from '../api/profile';
import type { UserData } from '../api/auth';
import { useUserStore } from './userStore';

type AuthState = {
  token: string | null;
  user: UserData | null;
  isLoading: boolean;
  setToken: (token: string) => Promise<void>;
  setUser: (user: UserData) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  setToken: async (token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token });
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    try {
      await profileApi.logout();
    } catch {
      // Ignora erro de rede — o token será apagado localmente de qualquer forma
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    useUserStore.getState().reset();
    set({ token: null, user: null });
  },

  initialize: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    set({ token: token ?? null, isLoading: false });
  },
}));

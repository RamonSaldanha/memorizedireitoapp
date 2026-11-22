import { create } from 'zustand';
import type { EnergyState } from '../api/trail';
import type { AvatarConfig } from '../lib/avatar';

type AvatarData = Partial<AvatarConfig> | null;

const FULL_ENERGY: EnergyState = { value: 25, max: 25, next_at: null, infinite: false };

type UserState = {
  lives: number;
  hasInfiniteLives: boolean;
  // Energia do mapa novo (no lugar das vidas, que ficam para os builds antigos)
  energy: EnergyState;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  name: string | null;
  // `avatar_config` da API; nulo para quem nunca montou o avatar.
  avatarConfig: AvatarData;
  setLives: (lives: number) => void;
  setHasInfiniteLives: (v: boolean) => void;
  setXp: (xp: number) => void;
  setEnergy: (energy: EnergyState) => void;
  setCurrentStreak: (n: number) => void;
  setLongestStreak: (n: number) => void;
  setName: (name: string | null) => void;
  setAvatarConfig: (avatarConfig: AvatarData) => void;
  reset: () => void;
  updateFromApi: (data: {
    lives?: number;
    has_infinite_lives?: boolean;
    energy?: EnergyState;
    xp: number;
    current_streak?: number;
    longest_streak?: number;
    name?: string | null;
    avatar_config?: AvatarData;
  }) => void;
};

export const useUserStore = create<UserState>((set) => ({
  lives: 5,
  hasInfiniteLives: false,
  energy: FULL_ENERGY,
  xp: 0,
  currentStreak: 0,
  longestStreak: 0,
  name: null,
  avatarConfig: null,
  setLives: (lives) => set({ lives }),
  setHasInfiniteLives: (v) => set({ hasInfiniteLives: v }),
  setXp: (xp) => set({ xp }),
  setEnergy: (energy) => set({ energy }),
  setCurrentStreak: (n) => set({ currentStreak: n }),
  setLongestStreak: (n) => set({ longestStreak: n }),
  setName: (name) => set({ name }),
  setAvatarConfig: (avatarConfig) => set({ avatarConfig }),
  reset: () =>
    set({
      lives: 5,
      hasInfiniteLives: false,
      energy: FULL_ENERGY,
      xp: 0,
      currentStreak: 0,
      longestStreak: 0,
      name: null,
      avatarConfig: null,
    }),
  updateFromApi: (data) => {
    const update: Partial<UserState> = { xp: data.xp };
    if (data.lives !== undefined) update.lives = data.lives;
    if (data.has_infinite_lives !== undefined) update.hasInfiniteLives = data.has_infinite_lives;
    if (data.energy !== undefined) update.energy = data.energy;
    if (data.current_streak !== undefined) update.currentStreak = data.current_streak;
    if (data.longest_streak !== undefined) update.longestStreak = data.longest_streak;
    if (data.name !== undefined) update.name = data.name;
    if (data.avatar_config !== undefined) update.avatarConfig = data.avatar_config;
    set(update);
  },
}));

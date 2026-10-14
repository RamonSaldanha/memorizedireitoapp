import { create } from 'zustand';
import type { AvatarConfig } from '../lib/avatar';

type AvatarData = Partial<AvatarConfig> | null;

type UserState = {
  lives: number;
  hasInfiniteLives: boolean;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  name: string | null;
  // `avatar_config` da API; nulo para quem nunca montou o avatar.
  avatarConfig: AvatarData;
  setLives: (lives: number) => void;
  setHasInfiniteLives: (v: boolean) => void;
  setXp: (xp: number) => void;
  setCurrentStreak: (n: number) => void;
  setLongestStreak: (n: number) => void;
  setName: (name: string | null) => void;
  setAvatarConfig: (avatarConfig: AvatarData) => void;
  reset: () => void;
  updateFromApi: (data: {
    lives: number;
    has_infinite_lives: boolean;
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
  xp: 0,
  currentStreak: 0,
  longestStreak: 0,
  name: null,
  avatarConfig: null,
  setLives: (lives) => set({ lives }),
  setHasInfiniteLives: (v) => set({ hasInfiniteLives: v }),
  setXp: (xp) => set({ xp }),
  setCurrentStreak: (n) => set({ currentStreak: n }),
  setLongestStreak: (n) => set({ longestStreak: n }),
  setName: (name) => set({ name }),
  setAvatarConfig: (avatarConfig) => set({ avatarConfig }),
  reset: () =>
    set({ lives: 5, hasInfiniteLives: false, xp: 0, currentStreak: 0, longestStreak: 0, name: null, avatarConfig: null }),
  updateFromApi: (data) => {
    const update: Partial<UserState> = {
      lives: data.lives,
      hasInfiniteLives: data.has_infinite_lives,
      xp: data.xp,
    };
    if (data.current_streak !== undefined) update.currentStreak = data.current_streak;
    if (data.longest_streak !== undefined) update.longestStreak = data.longest_streak;
    if (data.name !== undefined) update.name = data.name;
    if (data.avatar_config !== undefined) update.avatarConfig = data.avatar_config;
    set(update);
  },
}));

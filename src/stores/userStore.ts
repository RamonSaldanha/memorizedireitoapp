import { create } from 'zustand';

type UserState = {
  lives: number;
  hasInfiniteLives: boolean;
  xp: number;
  setLives: (lives: number) => void;
  setHasInfiniteLives: (v: boolean) => void;
  setXp: (xp: number) => void;
  updateFromApi: (data: { lives: number; has_infinite_lives: boolean; xp: number }) => void;
};

export const useUserStore = create<UserState>((set) => ({
  lives: 5,
  hasInfiniteLives: false,
  xp: 0,
  setLives: (lives) => set({ lives }),
  setHasInfiniteLives: (v) => set({ hasInfiniteLives: v }),
  setXp: (xp) => set({ xp }),
  updateFromApi: (data) =>
    set({ lives: data.lives, hasInfiniteLives: data.has_infinite_lives, xp: data.xp }),
}));

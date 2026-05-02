import { create } from 'zustand';

type UserState = {
  lives: number;
  hasInfiniteLives: boolean;
  xp: number;
  name: string | null;
  avatar: string | null;
  setLives: (lives: number) => void;
  setHasInfiniteLives: (v: boolean) => void;
  setXp: (xp: number) => void;
  setName: (name: string | null) => void;
  setAvatar: (avatar: string | null) => void;
  reset: () => void;
  updateFromApi: (data: {
    lives: number;
    has_infinite_lives: boolean;
    xp: number;
    name?: string | null;
    avatar?: string | null;
  }) => void;
};

export const useUserStore = create<UserState>((set) => ({
  lives: 5,
  hasInfiniteLives: false,
  xp: 0,
  name: null,
  avatar: null,
  setLives: (lives) => set({ lives }),
  setHasInfiniteLives: (v) => set({ hasInfiniteLives: v }),
  setXp: (xp) => set({ xp }),
  setName: (name) => set({ name }),
  setAvatar: (avatar) => set({ avatar }),
  reset: () => set({ lives: 5, hasInfiniteLives: false, xp: 0, name: null, avatar: null }),
  updateFromApi: (data) => {
    const update: Partial<UserState> = {
      lives: data.lives,
      hasInfiniteLives: data.has_infinite_lives,
      xp: data.xp,
    };
    if (data.name !== undefined) update.name = data.name;
    if (data.avatar !== undefined) update.avatar = data.avatar;
    set(update);
  },
}));

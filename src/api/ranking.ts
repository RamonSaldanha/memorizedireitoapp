import { apiClient } from './client';
import type { AvatarConfig } from '../lib/avatar';

export type RankingUser = {
  id: number;
  first_name: string;
  last_name: string;
  xp: number;
  position: number;
  is_current_user: boolean;
  avatar_config?: Partial<AvatarConfig> | null;
};

export const rankingApi = {
  getRanking: (period: 'all' | 'daily' | 'weekly' = 'all') =>
    apiClient.get<{
      top_users: RankingUser[];
      current_user_position: number | null;
      current_user_data: RankingUser | null;
      period: string;
    }>('/ranking', { params: { period } }),
};

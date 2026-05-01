import { apiClient } from './client';

export type DisciplineProgress = {
  id: number;
  uuid: string;
  name: string;
  icon: string;
  color: string;
  total_xp: number;
  level: number;
  current_xp_in_level: number;
  xp_for_next_level: number;
  progress_percent: number;
};

export const disciplinesApi = {
  getProgress: () =>
    apiClient.get<{
      discipline_progress: DisciplineProgress[];
      total_xp: number;
      global_level: {
        level: number;
        current_xp_in_level: number;
        xp_for_next_level: number;
        progress_percent: number;
      };
    }>('/disciplines'),
};

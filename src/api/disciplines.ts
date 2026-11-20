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
  // Conquistas com estrelas (0 a 5). `next_star_xp` é o XP total da próxima estrela (nulo com
  // as 5) e `badge_url` a arte da disciplina para essas estrelas (nula sem arte nova).
  stars: number;
  next_star_xp: number | null;
  badge_url: string | null;
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

import { apiClient } from './client';

export type ArticleOption = {
  id: number;
  word: string;
  is_correct: boolean;
  gap_order: number;
  position: number;
};

export type Article = {
  uuid: string;
  article_reference: string;
  original_content: string;
  practice_content: string;
  options: ArticleOption[];
  progress: {
    percentage: number;
    is_completed: boolean;
    best_score: number;
    attempts: number;
    wrong_answers: number;
    revisions: number;
  } | null;
};

export type PhaseProgress = {
  completed: number;
  total: number;
  percentage: number;
  block_status: ('correct' | 'incorrect' | 'pending')[];
};

export type Phase = {
  id: number;
  legislation_uuid: string;
  legislation_title: string;
  block_count: number;
  show_legislation_header: boolean;
  is_complete: boolean;
  is_blocked: boolean;
  is_current: boolean;
  is_review?: boolean;
  progress: PhaseProgress;
};

export type MapResponse = {
  phases: Phase[];
  legislations: Array<{ uuid: string; title: string; total_blocks: number }>;
  selectedLegislationUuids: string[];
  currentPhaseId: number | null;
  hasMoreAbove: boolean;
  hasMoreBelow: boolean;
  totalPhases: number;
  user: { lives: number; has_infinite_lives: boolean; xp: number };
};

export type LoadMorePhasesResponse = {
  phases: Phase[];
  hasMore: boolean;
};

export const playApi = {
  getMap: () => apiClient.get<MapResponse>('/play/map'),

  getMoreMapPhases: (direction: 'above' | 'below', cursor: number, limit = 20) =>
    apiClient.get<LoadMorePhasesResponse>('/play/map/more', {
      params: { direction, cursor, limit },
    }),

  getPhase: (phaseId: number) =>
    apiClient.get<{
      phase: Phase & {
        has_next_phase: boolean;
        next_phase_id: number | null;
        next_phase_is_review: boolean;
      };
      articles: Article[];
    }>(`/play/phases/${phaseId}`),

  saveProgress: (articleUuid: string, correctAnswers: number, totalAnswers: number) =>
    apiClient.post<{
      success: boolean;
      progress: {
        percentage: number;
        is_completed: boolean;
        best_score: number;
        attempts: number;
        wrong_answers: number;
        revisions: number;
      } | null;
      user: { lives: number; xp: number; has_infinite_lives: boolean };
      xp_gained: number;
      lost_life: boolean;
      no_lives: boolean;
    }>('/play/progress', {
      article_uuid: articleUuid,
      correct_answers: correctAnswers,
      total_answers: totalAnswers,
    }),

  rewardLife: () =>
    apiClient.post<{ success: boolean; user: { lives: number; has_infinite_lives: boolean } }>(
      '/play/reward-life'
    ),
};

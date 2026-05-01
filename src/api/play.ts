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
  is_fully_complete: boolean;
  all_attempted: boolean;
  has_errors: boolean;
  article_status: ('correct' | 'incorrect' | 'pending')[];
};

export type Phase = {
  id: number;
  title: string;
  reference_name: string;
  reference_uuid: string;
  article_count: number;
  difficulty: number;
  first_article: string | null;
  phase_number: number;
  chunk_index?: number;
  is_complete: boolean;
  progress: PhaseProgress;
  is_blocked: boolean;
  is_current: boolean;
  is_review: boolean;
};

export type JourneyInfo = {
  current: number;
  total: number;
  has_previous: boolean;
  has_next: boolean;
  phases_in_journey: number;
  total_phases: number;
  journey_title: string | null;
  current_phase_id: number | null;
};

export const playApi = {
  getMap: (journey?: number) =>
    apiClient.get<{
      phases: Phase[];
      journey: JourneyInfo;
      user: { lives: number; has_infinite_lives: boolean; xp: number };
      has_preferences: boolean;
    }>('/play/map', { params: journey ? { journey } : {} }),

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

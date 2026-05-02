import { apiClient } from './client';

/* ===== Tipos do mapa ===== */
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

/* ===== Tipos do gameplay (segmentos / fase ativa) ===== */
export type Lacuna = {
  gap_order: number;
  word: string;
  word_position: number;
};

export type ActiveSegment = {
  uuid: string;
  original_text: string;
  position: number;
  article_reference: string;
  structural_marker: string;
  segment_type?: string;
  lacunas: Lacuna[];
  options: string[];
  total_gaps: number;
};

export type SegmentAnswer = {
  gap_order: number;
  word_position: number;
  correct_word: string;
  user_word: string;
  is_correct: boolean;
};

export type CompletedSegment = {
  uuid: string;
  original_text: string;
  position: number;
  article_reference: string;
  structural_marker: string;
  segment_type?: string;
  answers: SegmentAnswer[] | null;
  is_completed: boolean;
  best_score: number;
};

export type PhaseDetail = {
  legislation: { uuid: string; title: string };
  completedSegments: CompletedSegment[];
  activeSegment: ActiveSegment | null;
  progress: { current: number; total: number; percentage: number };
  hasMoreAbove: boolean;
  allComplete: boolean;
  phaseId: number;
  nextPhaseId: number | null;
  phaseBlockUuids: string[];
  user: { lives: number; has_infinite_lives: boolean; xp: number };
};

export type SubmitPayload = {
  segment_uuid: string;
  answers: SegmentAnswer[];
  correct_count: number;
  total_count: number;
  phase_block_uuids?: string[];
};

export type SubmitResponse = {
  success: boolean;
  progress: {
    is_completed: boolean;
    best_score: number;
    attempts: number;
    percentage: number;
  };
  answers: SegmentAnswer[];
  next_segment: ActiveSegment | null;
  user: { lives: number; has_infinite_lives: boolean; xp: number };
  xp_gained: number;
  lost_life: boolean;
  should_redirect: boolean;
  redirect_url: string | null;
};

export type LoadMoreAboveResponse = {
  segments: CompletedSegment[];
  hasMore: boolean;
};

export const playApi = {
  getMap: () => apiClient.get<MapResponse>('/play/map'),

  getMoreMapPhases: (direction: 'above' | 'below', cursor: number, limit = 20) =>
    apiClient.get<LoadMorePhasesResponse>('/play/map/more', {
      params: { direction, cursor, limit },
    }),

  getPhaseDetail: (phaseId: number) =>
    apiClient.get<PhaseDetail>(`/play/phases/${phaseId}`),

  submitSegment: (payload: SubmitPayload) =>
    apiClient.post<SubmitResponse>('/play/submit', payload),

  loadMoreAbove: (
    phaseId: number,
    legislationUuid: string,
    beforePosition: number,
    limit = 5,
  ) =>
    apiClient.get<LoadMoreAboveResponse>(`/play/phase/${phaseId}/more-above`, {
      params: { before_position: beforePosition, legislation_uuid: legislationUuid, limit },
    }),

  rewardLife: () =>
    apiClient.post<{ success: boolean; user: { lives: number; has_infinite_lives: boolean } }>(
      '/play/reward-life',
    ),
};

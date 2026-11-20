import { apiClient } from './client';
import type { ActiveSegment, CompletedSegment, DisciplineLevelUp, SegmentAnswer } from './play';

// Mapa novo (quadrados de 4 fases), rotas /trail da API. Os dados são os mesmos que a web
// recebe em /beta/play; os tipos seguem resources/js/types/beta-play.ts e
// resources/js/types/study-material.ts do site.

/* ===== Mapa ===== */

export type TrailGroupPhase = { id: number; is_complete: boolean; is_current: boolean };

// Desafio do quadrado: o último passo do quadrado que tem material de estudo
export type TrailChallengeState = {
  // Uuid do último bloco do quadrado
  key: string | null;
  // none: quadrado sem material · locked: faltam fases · available · complete
  state: 'none' | 'locked' | 'available' | 'complete';
  // É o passo atual da trilha: o quadrado seguinte espera por ele
  is_current: boolean;
  total: number;
  completed: number;
  questions: number;
};

// Dia da prova: fase paralela ao fim de cada etapa
export type TrailExamState = {
  // Uuid do último bloco da etapa
  key: string | null;
  // locked: falta concluir a etapa · empty: sem questões · available · complete: já entregou uma prova
  state: 'locked' | 'empty' | 'available' | 'complete';
  questions: number;
  seconds: number;
  xp_per_correct: number;
  best_correct: number;
  in_progress: boolean;
};

export type TrailGroup = {
  id: number;
  state: 'complete' | 'current' | 'locked';
  completed_phases: number;
  total_phases: number;
  completed_steps: number;
  total_steps: number;
  current_phase_id: number | null;
  phases: TrailGroupPhase[];
  challenge: TrailChallengeState;
};

export type TrailSection = {
  number: number;
  legislation_title: string;
  completed_phases: number;
  total_phases: number;
  completed_steps: number;
  total_steps: number;
  is_current: boolean;
  groups: TrailGroup[];
  exam: TrailExamState;
};

export type TrailMapResponse = {
  sections: TrailSection[];
  hasMoreAbove: boolean;
  hasMoreBelow: boolean;
  window: { before: number; after: number };
};

/* ===== Fase ===== */

export type TrailPhaseResponse = {
  legislation: { uuid: string; title: string };
  phaseId: number;
  // Passo dentro do quadrado e quantos passos ele tem (o desafio, quando há, é o último)
  phaseNumber: number;
  phasesPerGroup: number;
  isReview: boolean;
  // Os desafios que a fase apresenta: os blocos não concluídos (na revisão, todos)
  challenges: ActiveSegment[];
  // Texto da fase inteira e o que vem antes dela, com as respostas já gravadas
  phaseBlocks: CompletedSegment[];
  earlierBlocks: CompletedSegment[];
  hasMoreAbove: boolean;
};

export type TrailChallengeResult = {
  segment_uuid: string;
  answers: SegmentAnswer[];
  correct_count: number;
  total_count: number;
};

export type TrailFailResponse = { lost_life: boolean; lives: number; out_of_lives: boolean };

export type TrailFinishResponse = {
  xp_gained: number;
  discipline_level_up: DisciplineLevelUp | null;
  user: { lives: number; xp: number; has_infinite_lives: boolean };
};

/* ===== Desafio do quadrado (material de estudo) ===== */

export type StudyBoard = 'cebraspe' | 'fgv' | 'fcc' | 'vunesp';

const BOARD_LABELS: Record<string, string> = { cebraspe: 'Cebraspe', fgv: 'FGV', fcc: 'FCC', vunesp: 'Vunesp' };
export const boardLabel = (board: string) => BOARD_LABELS[board] ?? board;

/** Questão como o jogador recebe: sem gabarito, comentário nem fundamento. */
export type StudyQuestion = {
  board: StudyBoard;
  type: 'true_false' | 'multiple_choice';
  statement: string;
  options: Record<string, string> | null;
};

export type CheckpointQuestion = StudyQuestion & { position: number };

/** Trecho de texto do resumo com o estilo dele. */
export type SummaryInline = { text: string; bold?: true; italic?: true; code?: true };

/** O resumo em blocos (StudyMaterialService::summaryBlocks no servidor). */
export type SummaryBlock =
  | { type: 'heading'; level: number; inlines: SummaryInline[] }
  | { type: 'paragraph'; inlines: SummaryInline[] }
  | { type: 'list'; ordered: boolean; start: number; items: SummaryBlock[][] }
  | { type: 'quote'; blocks: SummaryBlock[] }
  | { type: 'table'; head: SummaryInline[][]; rows: SummaryInline[][][] }
  | { type: 'rule' }
  | { type: 'code'; text: string };

export type CheckpointMaterial = {
  uuid: string;
  title: string;
  legislation_title: string;
  summary_blocks: SummaryBlock[];
  questions: CheckpointQuestion[];
  done: boolean;
  summary_read: boolean;
  answered: number[];
};

export type CheckpointResponse = {
  checkpoint: { key: string; section_number: number; step_number: number; total: number; completed: number };
  materials: CheckpointMaterial[];
};

export type CheckpointStepResponse = {
  material_completed: boolean;
  xp_gained: number;
  discipline_level_up: DisciplineLevelUp | null;
  checkpoint: { completed: number; total: number };
  user: { xp: number };
};

export type CheckpointAnswerResponse = CheckpointStepResponse & {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  legal_basis: string;
};

/* ===== Dia da prova ===== */

export type ExamQuestion = StudyQuestion & { uuid: string };

export type ExamGiven = { answer: string; is_correct: boolean; correct_answer: string };

export type ExamAttempt = {
  seconds_left: number;
  seconds_total: number;
  xp: number;
  questions: ExamQuestion[];
  answers: Record<string, ExamGiven>;
};

export type ExamReviewItem = ExamQuestion & ExamGiven & { explanation: string; legal_basis: string };

export type ExamResult = {
  correct: number;
  answered: number;
  total: number;
  xp_gained: number;
  best_correct: number;
  discipline_level_up: DisciplineLevelUp | null;
  user: { xp: number };
  review: ExamReviewItem[];
};

export type ExamResponse = {
  exam: {
    key: string;
    section_number: number;
    legislation_title: string;
    questions: number;
    seconds: number;
    xp_per_correct: number;
    best_correct: number;
    attempts: number;
  };
  // Prova em andamento ao abrir (a pessoa saiu e voltou com o tempo correndo)
  attempt: ExamAttempt | null;
};

export type ExamAnswerResponse = {
  is_correct: boolean;
  correct_answer: string;
  // XP somado na prova até aqui (só é creditado na entrega)
  xp: number;
  finished: boolean;
  result: ExamResult | null;
};

/** Erro da API com o código que ela manda (`no_lives`, `unavailable`, `trail_disabled`). */
export function apiErrorCode(error: unknown): string | null {
  const data = (error as { response?: { data?: { code?: string } } })?.response?.data;
  return data?.code ?? null;
}

export const trailApi = {
  map: (before = 0, after = 0) => apiClient.get<TrailMapResponse>('/trail', { params: { before, after } }),

  phase: (phaseId: number) => apiClient.get<TrailPhaseResponse>(`/trail/phases/${phaseId}`),
  fail: () => apiClient.post<TrailFailResponse>('/trail/fail'),
  finish: (phaseId: number, results: TrailChallengeResult[]) =>
    apiClient.post<TrailFinishResponse>('/trail/finish', { phase_id: phaseId, results }),

  challenge: (key: string) => apiClient.get<CheckpointResponse>(`/trail/challenges/${key}`),
  summary: (key: string, material: string) =>
    apiClient.post<CheckpointStepResponse>(`/trail/challenges/${key}/summary`, { material }),
  answer: (key: string, material: string, position: number, answer: string) =>
    apiClient.post<CheckpointAnswerResponse>(`/trail/challenges/${key}/answer`, { material, position, answer }),

  exam: (key: string) => apiClient.get<ExamResponse>(`/trail/exams/${key}`),
  startExam: (key: string) => apiClient.post<ExamAttempt>(`/trail/exams/${key}/start`),
  answerExam: (key: string, question: string, answer: string) =>
    apiClient.post<ExamAnswerResponse>(`/trail/exams/${key}/answer`, { question, answer }),
  finishExam: (key: string) => apiClient.post<ExamResult>(`/trail/exams/${key}/finish`),
};

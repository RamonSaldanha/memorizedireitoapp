import { apiClient } from './client';

// Peças do jogo de lacunas usadas pelo mapa (/trail) e pelo onboarding, e a rota de /play que
// o app ainda usa: o texto anterior da lei, ao rolar a fase para cima. O mapa antigo
// (/play/map) e a vida do anúncio saíram do app (agora é energia, em /trail); as rotas
// continuam no servidor para quem tem build antiga.

/* ===== Tipos do gameplay (blocos / desafio ativo) ===== */
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
  // Rótulo do dispositivo vetado ou revogado (bloco só com "IX-A -;", "Art. 194."); nulo nos demais
  historical_label?: string | null;
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
  historical_label?: string | null;
};

/**
 * Acertos necessários para passar num bloco (espelha UserSegmentProgress::requiredCorrect
 * no servidor): pode errar no máximo 1 lacuna (1 lacuna exige o acerto), nunca acima dos
 * 70% da regra antiga.
 */
export function requiredCorrect(totalGaps: number): number {
  if (totalGaps <= 0) return 0;
  if (totalGaps === 1) return 1;
  return Math.min(totalGaps - 1, Math.ceil(totalGaps * 0.7));
}

export type DisciplineLevelUp = {
  discipline_id: number;
  discipline_name: string;
  icon: string;
  color: string;
  old_level: number;
  new_level: number;
  // Conquistas com estrelas: quantas a disciplina tem agora e a arte do badge (nula sem arte nova)
  stars?: number;
  badge_url?: string | null;
};

export type LoadMoreAboveResponse = {
  segments: CompletedSegment[];
  hasMore: boolean;
};

export const playApi = {
  // Blocos da lei antes de `beforePosition` (char_start), com as respostas já gravadas
  loadMoreAbove: (
    phaseId: number,
    legislationUuid: string,
    beforePosition: number,
    limit = 5,
  ) =>
    apiClient.get<LoadMoreAboveResponse>(`/play/phase/${phaseId}/more-above`, {
      params: { before_position: beforePosition, legislation_uuid: legislationUuid, limit },
    }),
};

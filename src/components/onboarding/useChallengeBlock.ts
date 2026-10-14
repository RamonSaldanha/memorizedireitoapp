import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveSegment, CompletedSegment, SegmentAnswer } from '../../api/play';
import type { ChallengeArticle } from '../../lib/onboarding/quiz';
import { useGapSelections } from '../../hooks/useGapSelections';

/**
 * O desafio do onboarding é um bloco do jogo de verdade (porte do
 * `OnboardingChallenge.vue`): o mesmo `ActiveChallenge` e os mesmos controles
 * da tela de fase. Muda só o que acontece depois: aqui não se perde vida, e o
 * acerto chama `onSolved` (a tela comemora como na fase).
 */
export function useChallengeBlock(article: ChallengeArticle, onSolved: () => void) {
  /** O artigo no formato que o jogo usa: texto + posição de cada lacuna. */
  const segment = useMemo<ActiveSegment>(() => {
    const original = `${article.ref} ${article.text}`;
    const words = original.split(/\s+/).filter(Boolean);
    let from = article.ref.split(/\s+/).filter(Boolean).length;

    const lacunas = article.gaps.map((word, i) => {
      const position = words.indexOf(word, from);
      from = position + 1;
      return { gap_order: i + 1, word, word_position: position };
    });

    return {
      // O ActiveChallenge memoriza o texto pelo uuid: um por artigo.
      uuid: `onboarding:${article.law}`,
      original_text: original,
      position: 0,
      segment_type: 'article',
      article_reference: article.ref,
      structural_marker: article.ref,
      lacunas,
      options: article.bank,
      total_gaps: lacunas.length,
    };
  }, [article]);

  const completedSegment = useMemo<CompletedSegment>(() => ({
    ...segment,
    answers: segment.lacunas.map((l) => ({
      gap_order: l.gap_order,
      word_position: l.word_position,
      correct_word: l.word,
      user_word: l.word,
      is_correct: true,
    })),
    is_completed: true,
    best_score: 100,
  }), [segment]);

  const [verified, setVerified] = useState(false);
  const [verificationResults, setVerificationResults] = useState<SegmentAnswer[]>([]);
  const [solvedNow, setSolvedNow] = useState(false);
  const gaps = useGapSelections(segment, verified);

  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  // Outro artigo (voltou e trocou a área): começa do zero.
  useEffect(() => {
    gaps.setUserSelections({});
    setVerified(false);
    setVerificationResults([]);
    setSolvedNow(false);
  }, [segment.uuid]);

  const verify = useCallback(async () => {
    if (!gaps.allFilled || verified) return;

    const answers: SegmentAnswer[] = segment.lacunas.map((l) => ({
      gap_order: l.gap_order,
      word_position: l.word_position,
      correct_word: l.word,
      user_word: gaps.userSelections[l.gap_order] ?? '',
      is_correct: gaps.userSelections[l.gap_order] === l.word,
    }));

    setVerified(true);
    setVerificationResults(answers);

    if (answers.every((a) => a.is_correct)) {
      setSolvedNow(true);
      onSolved();
      return;
    }

    // Errou: deixa ver o que estava errado e libera para tentar de novo.
    await new Promise((resolve) => setTimeout(resolve, 1600));
    if (!mountedRef.current) return;
    gaps.setUserSelections({});
    setVerified(false);
    setVerificationResults([]);
  }, [segment, gaps.allFilled, gaps.userSelections, verified, onSolved]);

  return {
    segment,
    completedSegment,
    verified,
    verificationResults,
    solvedNow,
    userSelections: gaps.userSelections,
    availableOptions: gaps.availableOptions,
    allFilled: gaps.allFilled,
    select: gaps.fillNextEmpty,
    unselect: gaps.unselectGap,
    clear: gaps.clearAll,
    verify,
  };
}

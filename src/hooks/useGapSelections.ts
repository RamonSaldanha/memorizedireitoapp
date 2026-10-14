import { useCallback, useMemo, useState } from 'react';
import type { ActiveSegment } from '../api/play';

/**
 * Palavras escolhidas para as lacunas de um bloco: o banco de palavras ainda
 * disponíveis, preencher a próxima lacuna vazia, tirar uma palavra e limpar.
 *
 * A tela de fase e o desafio do onboarding usam o mesmo — é o mesmo bloco do
 * jogo nos dois.
 */
export function useGapSelections(active: ActiveSegment | null, verified: boolean) {
  const [userSelections, setUserSelections] = useState<Record<number, string>>({});

  /* ===== Tokens de palavras disponíveis (descontando duplicatas usadas) ===== */
  const availableOptions = useMemo(() => {
    if (!active) return [];
    const selectedCounts: Record<string, number> = {};
    for (const w of Object.values(userSelections)) {
      selectedCounts[w] = (selectedCounts[w] || 0) + 1;
    }
    const result: string[] = [];
    const usedCounts: Record<string, number> = {};
    for (const w of active.options) {
      usedCounts[w] = (usedCounts[w] || 0) + 1;
      const used = selectedCounts[w] || 0;
      if (usedCounts[w] > used) result.push(w);
    }
    return result;
  }, [active?.uuid, userSelections]);

  const allFilled = useMemo(() => {
    if (!active) return false;
    return active.lacunas.every((l) => !!userSelections[l.gap_order]);
  }, [active?.uuid, userSelections]);

  const fillNextEmpty = useCallback(
    (word: string) => {
      if (!active || verified) return;
      // Encontra próxima lacuna vazia em ordem de gap_order
      const sorted = [...active.lacunas].sort((a, b) => a.gap_order - b.gap_order);
      const next = sorted.find((l) => !userSelections[l.gap_order]);
      if (!next) return;
      setUserSelections((prev) => ({ ...prev, [next.gap_order]: word }));
    },
    [active?.uuid, verified, userSelections],
  );

  const unselectGap = useCallback(
    (gapOrder: number) => {
      if (verified) return;
      setUserSelections((prev) => {
        const next = { ...prev };
        delete next[gapOrder];
        return next;
      });
    },
    [verified],
  );

  const clearAll = useCallback(() => {
    if (verified) return;
    setUserSelections({});
  }, [verified]);

  return { userSelections, setUserSelections, availableOptions, allFilled, fillNextEmpty, unselectGap, clearAll };
}

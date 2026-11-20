import { useCallback, useMemo, useState } from 'react';
import type { ActiveSegment } from '../api/play';

/**
 * Palavras escolhidas para as lacunas de um bloco: o banco de palavras, preencher a próxima
 * lacuna vazia, tirar uma palavra e limpar.
 *
 * Como na web, o banco não se reorganiza: cada palavra lembra de qual botão do banco veio
 * (`selectedOption`), o botão usado fica vazio no lugar dele e a palavra volta para lá ao
 * sair da lacuna.
 *
 * A tela de fase, a fase do mapa novo e o desafio do onboarding usam o mesmo — é o mesmo
 * bloco do jogo em todos.
 */
export function useGapSelections(active: ActiveSegment | null, verified: boolean) {
  const [userSelections, setUserSelections] = useState<Record<number, string>>({});
  // gap_order -> índice em active.options
  const [selectedOption, setSelectedOption] = useState<Record<number, number>>({});

  // Botões do banco em uso. Só vale a origem de quem ainda está na lacuna com a mesma
  // palavra, então zerar `userSelections` por fora também esvazia isto.
  const usedOptions = useMemo(() => {
    const used = new Set<number>();
    if (!active) return used;
    for (const [gap, index] of Object.entries(selectedOption)) {
      if (userSelections[Number(gap)] === active.options[index]) used.add(index);
    }
    return used;
  }, [active?.uuid, selectedOption, userSelections]);

  /* ===== Palavras ainda disponíveis (descontando duplicatas usadas) ===== */
  const availableOptions = useMemo(() => {
    if (!active) return [];
    return active.options.filter((_, index) => !usedOptions.has(index));
  }, [active?.uuid, usedOptions]);

  const allFilled = useMemo(() => {
    if (!active) return false;
    return active.lacunas.every((l) => !!userSelections[l.gap_order]);
  }, [active?.uuid, userSelections]);

  /** Leva a palavra do botão `index` do banco para a próxima lacuna vazia, na ordem do texto. */
  const selectOption = useCallback(
    (index: number) => {
      if (!active || verified || usedOptions.has(index)) return;
      const sorted = [...active.lacunas].sort((a, b) => a.gap_order - b.gap_order);
      const next = sorted.find((l) => !userSelections[l.gap_order]);
      if (!next) return;
      setUserSelections((prev) => ({ ...prev, [next.gap_order]: active.options[index] }));
      setSelectedOption((prev) => ({ ...prev, [next.gap_order]: index }));
    },
    [active?.uuid, verified, userSelections, usedOptions],
  );

  /** O mesmo, pela palavra: usa o primeiro botão livre com ela. */
  const fillNextEmpty = useCallback(
    (word: string) => {
      if (!active) return;
      const index = active.options.findIndex((w, i) => w === word && !usedOptions.has(i));
      if (index >= 0) selectOption(index);
    },
    [active?.uuid, usedOptions, selectOption],
  );

  const unselectGap = useCallback(
    (gapOrder: number) => {
      if (verified) return;
      setUserSelections((prev) => {
        const next = { ...prev };
        delete next[gapOrder];
        return next;
      });
      setSelectedOption((prev) => {
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
    setSelectedOption({});
  }, [verified]);

  return {
    userSelections,
    setUserSelections,
    availableOptions,
    usedOptions,
    allFilled,
    selectOption,
    fillNextEmpty,
    unselectGap,
    clearAll,
  };
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Heart, Infinity as InfinityIcon } from 'lucide-react-native';
import { playApi, requiredCorrect, type ActiveSegment, type CompletedSegment, type DisciplineLevelUp, type SegmentAnswer } from '../../api/play';
import { apiErrorCode, trailApi, type TrailChallengeResult } from '../../api/trail';
import { ActiveChallenge } from '../../components/game/ActiveChallenge';
import { CompletedSegmentView } from '../../components/game/CompletedSegment';
import { PhaseControls } from '../../components/game/PhaseControls';
import { LevelUpOverlay } from '../../components/game/LevelUpOverlay';
import { ConfirmSheet, PhaseComplete, ResultBar, ResultText, TrailTopBar } from '../../components/trail/TrailUi';
import { GameButton } from '../../components/ui/GameButton';
import { useConfetti } from '../../hooks/useConfetti';
import { useGapSelections } from '../../hooks/useGapSelections';
import { useGameSounds } from '../../hooks/useGameSounds';
import { useAppearance } from '../../hooks/useAppearance';
import { useUserStore } from '../../stores/userStore';
import { colors } from '../../theme/colors';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Props = NativeStackScreenProps<PlayStackParamList, 'TrailPhase'>;

type LastResult = TrailChallengeResult & { passed: boolean };

function toast(message: string) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.LONG);
}

/**
 * Fase do mapa novo, como a da web (BetaPlay/Phase.vue): a fase inteira fica no aparelho e
 * nada é gravado antes do último desafio. Errar tira a vida na hora (`/trail/fail`) e o mesmo
 * desafio volta em branco; o fim grava tudo de uma vez (`/trail/finish`) e dá o XP. Sair no
 * meio perde a fase.
 */
export function TrailPhaseScreen({ route, navigation }: Props) {
  const { phaseId } = route.params;
  const queryClient = useQueryClient();
  const { isDark, theme } = useAppearance();
  const lives = useUserStore((s) => s.lives);
  const hasInfiniteLives = useUserStore((s) => s.hasInfiniteLives);
  const updateFromApi = useUserStore((s) => s.updateFromApi);

  const { data, isLoading, error } = useQuery({
    queryKey: ['trail-phase', phaseId],
    queryFn: async () => (await trailApi.phase(phaseId)).data,
    gcTime: 0,
    retry: false,
  });

  // Sem vidas ou fase que não abre: sai daqui
  useEffect(() => {
    const code = apiErrorCode(error);
    if (code === 'no_lives') navigation.replace('NoLives');
    else if (code === 'unavailable') {
      toast('Esta fase não está disponível.');
      navigation.goBack();
    }
  }, [error]);

  const [queue, setQueue] = useState<ActiveSegment[]>([]);
  const [passed, setPassed] = useState<Record<string, TrailChallengeResult>>({});
  const [attempt, setAttempt] = useState(0);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [stage, setStage] = useState<'playing' | 'saving' | 'failed-to-save' | 'done'>('playing');
  const [confirmExit, setConfirmExit] = useState(false);
  const [gapsAnswered, setGapsAnswered] = useState(0);
  const [gapsCorrect, setGapsCorrect] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const [levelUp, setLevelUp] = useState<DisciplineLevelUp | null>(null);
  const [earlier, setEarlier] = useState<CompletedSegment[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const active = queue[0] ?? null;
  const [verified, setVerified] = useState(false);
  const [verificationResults, setVerificationResults] = useState<SegmentAnswer[]>([]);
  const gaps = useGapSelections(active, verified);

  const { ConfettiView, fire: fireConfetti } = useConfetti();
  const { playPhaseComplete } = useGameSounds();

  const scrollRef = useRef<ScrollView>(null);
  const viewport = useRef(0);
  const activeBottom = useRef(0);
  const oldHeight = useRef<number | null>(null);
  const oldY = useRef(0);

  useEffect(() => {
    if (!data) return;
    setQueue(data.challenges);
    setEarlier(data.earlierBlocks);
    setHasMore(data.hasMoreAbove);
  }, [data?.phaseId]);

  const total = data?.challenges.length ?? 0;
  const passedCount = Object.keys(passed).length;
  const accuracy = gapsAnswered > 0 ? Math.round((gapsCorrect / gapsAnswered) * 100) : 100;

  // Texto acima do desafio: os blocos anteriores da lei e os da fase que vêm antes dele,
  // com as respostas dadas nesta fase
  const blocksAbove = useMemo((): CompletedSegment[] => {
    if (!data) return [];
    if (!active) return earlier;
    const index = data.phaseBlocks.findIndex((block) => block.uuid === active.uuid);
    const fromPhase = data.phaseBlocks.slice(0, Math.max(0, index)).map((block) => {
      const result = passed[block.uuid];
      return result ? { ...block, answers: result.answers, is_completed: true } : block;
    });
    return [...earlier, ...fromPhase];
  }, [data, active?.uuid, earlier, passed]);

  // Deixa o desafio inteiro à vista, encostado no fim da área de texto
  const showActive = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, activeBottom.current - viewport.current + 16), animated: false });
    });
  }, []);

  const verify = useCallback(async () => {
    if (!active || !gaps.allFilled || verified) return;

    const answers: SegmentAnswer[] = active.lacunas.map((l) => ({
      gap_order: l.gap_order,
      word_position: l.word_position,
      correct_word: l.word,
      user_word: gaps.userSelections[l.gap_order] ?? '',
      is_correct: gaps.userSelections[l.gap_order] === l.word,
    }));
    const result: TrailChallengeResult = {
      segment_uuid: active.uuid,
      answers,
      correct_count: answers.filter((a) => a.is_correct).length,
      total_count: answers.length,
    };
    const isPass = result.correct_count >= requiredCorrect(result.total_count);

    setVerified(true);
    setVerificationResults(answers);
    setGapsAnswered((n) => n + result.total_count);
    setGapsCorrect((n) => n + result.correct_count);
    setLastResult({ ...result, passed: isPass });

    if (isPass) {
      setPassed((prev) => ({ ...prev, [result.segment_uuid]: result }));
      return;
    }

    // Errou: a vida sai na hora (o progresso continua só no aparelho)
    try {
      const { data: fail } = await trailApi.fail();
      updateFromApi({ lives: fail.lives, has_infinite_lives: hasInfiniteLives, xp: useUserStore.getState().xp });
      if (fail.out_of_lives) navigation.replace('NoLives');
    } catch {
      // Falha de rede aqui não trava a fase
    }
  }, [active?.uuid, gaps.allFilled, gaps.userSelections, verified, hasInfiniteLives]);

  const finish = useCallback(
    async (results: Record<string, TrailChallengeResult>) => {
      setStage('saving');
      try {
        const { data: done } = await trailApi.finish(phaseId, Object.values(results));
        setXpGained(done.xp_gained);
        updateFromApi(done.user);
        setStage('done');
        fireConfetti();
        playPhaseComplete();
        setLevelUp(done.discipline_level_up);
        queryClient.invalidateQueries({ queryKey: ['trail-map'] });
        queryClient.invalidateQueries({ queryKey: ['disciplines'] });
      } catch {
        setStage('failed-to-save');
      }
    },
    [phaseId],
  );

  const next = useCallback(() => {
    if (!lastResult) return;

    // Errou: o mesmo desafio volta em branco e só passa adiante quando for vencido
    const rest = lastResult.passed ? queue.slice(1) : queue;
    setQueue(rest);
    setLastResult(null);
    setAttempt((n) => n + 1);
    setVerified(false);
    setVerificationResults([]);
    gaps.clearAll();
    gaps.setUserSelections({});

    if (rest.length === 0) finish(passed);
    else showActive();
  }, [lastResult, queue, passed, finish]);

  const exit = () => {
    if (stage === 'playing' && passedCount + gapsAnswered > 0) {
      setConfirmExit(true);
      return;
    }
    navigation.goBack();
  };

  /* ===== Texto anterior, ao rolar para cima ===== */
  const loadMoreAbove = useCallback(async () => {
    if (loadingMore || !hasMore || earlier.length === 0 || !data) return;
    setLoadingMore(true);
    try {
      const { data: more } = await playApi.loadMoreAbove(phaseId, data.legislation.uuid, earlier[0].position, 5);
      if (more.segments.length > 0) setEarlier((prev) => [...more.segments, ...prev]);
      setHasMore(more.hasMore && more.segments.length > 0);
    } catch {
      // Basta rolar de novo para tentar outra vez
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, earlier, data, phaseId]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y < 60 && hasMore && !loadingMore && earlier.length > 0) {
      oldHeight.current = e.nativeEvent.contentSize.height;
      oldY.current = y;
      loadMoreAbove();
    }
  };

  // Mantém na tela o que a pessoa estava lendo depois de carregar o texto de cima
  const onContentSizeChange = (_w: number, height: number) => {
    if (oldHeight.current !== null) {
      const delta = height - oldHeight.current;
      oldHeight.current = null;
      if (delta > 0) scrollRef.current?.scrollTo({ y: oldY.current + delta, animated: false });
    }
  };

  /* ===== Telas ===== */

  if (isLoading || (!data && !error)) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={colors.family.brandEdge} size="large" />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.message, { color: theme.foreground }]}>Não foi possível abrir a fase.</Text>
        <GameButton variant="purple" onPress={() => navigation.goBack()}>
          Voltar ao mapa
        </GameButton>
      </SafeAreaView>
    );
  }

  if (stage === 'done') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <PhaseComplete
          title={data.isReview ? 'Revisão concluída!' : 'Fase concluída!'}
          count={total}
          countLabel="Desafios"
          xp={xpGained}
          accuracy={accuracy}
          onContinue={() => navigation.goBack()}
        />
        <LevelUpOverlay levelUp={levelUp} onDone={() => setLevelUp(null)} isDark={isDark} />
        <ConfettiView />
      </SafeAreaView>
    );
  }

  if (stage !== 'playing') {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        {stage === 'saving' ? (
          <>
            <ActivityIndicator color={colors.blue[500]} size="large" />
            <Text style={[styles.message, { color: theme.mutedForeground }]}>Guardando seu progresso...</Text>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.foreground }]}>Não foi possível guardar a fase</Text>
            <Text style={[styles.message, { color: theme.mutedForeground }]}>
              Suas respostas continuam aqui. Confira a conexão e tente de novo.
            </Text>
            <GameButton variant="purple" size="lg" onPress={() => finish(passed)}>
              Tentar de novo
            </GameButton>
          </>
        )}
      </SafeAreaView>
    );
  }

  const wrong = lastResult?.answers.filter((a) => !a.is_correct) ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <TrailTopBar
        progress={(passedCount / Math.max(1, total)) * 100}
        onExit={exit}
        caption={`${data.legislation.title} · Passo ${data.phaseNumber} de ${data.phasesPerGroup}`}
        right={
          <View style={styles.lives}>
            <Heart size={20} color={colors.red[500]} fill={colors.red[500]} />
            {hasInfiniteLives ? <InfinityIcon size={20} color={colors.red[500]} /> : <Text style={styles.livesText}>{lives}</Text>}
          </View>
        }
      />

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        onLayout={(e) => {
          viewport.current = e.nativeEvent.layout.height;
        }}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onContentSizeChange={onContentSizeChange}
      >
        {loadingMore ? <ActivityIndicator color={colors.blue[500]} style={{ paddingVertical: 12 }} /> : null}

        {blocksAbove.map((block) => (
          <CompletedSegmentView key={block.uuid} segment={block} showHistorical />
        ))}

        {active ? (
          <View
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              activeBottom.current = y + height + 16;
              showActive();
            }}
            style={styles.active}
          >
            <ActiveChallenge
              key={`${active.uuid}-${attempt}`}
              segment={active}
              userSelections={gaps.userSelections}
              verified={verified}
              verificationResults={verificationResults}
              onUnselect={gaps.unselectGap}
              hideResult
              showHistorical
            />
          </View>
        ) : null}
      </ScrollView>

      {active && !lastResult ? (
        <PhaseControls
          options={gaps.availableOptions}
          hasLacunas={active.lacunas.length > 0}
          allFilled={gaps.allFilled}
          verified={verified}
          isSubmitting={false}
          onSelect={gaps.fillNextEmpty}
          onClear={gaps.clearAll}
          onVerify={verify}
          bank={{ options: active.options, used: gaps.usedOptions, onSelect: gaps.selectOption }}
        />
      ) : null}

      {lastResult ? (
        <ResultBar correct={lastResult.passed} buttonLabel={lastResult.passed ? 'Continuar' : 'Tentar de novo'} onContinue={next}>
          {lastResult.answers.length > 0 ? (
            <ResultText correct={lastResult.passed}>
              {lastResult.answers.length - wrong.length} de {lastResult.answers.length} corretas
            </ResultText>
          ) : null}
          {wrong.length > 0 ? (
            <>
              <ResultText correct={lastResult.passed} bold>
                Resposta correta:
              </ResultText>
              {wrong.map((answer) => (
                <ResultText key={answer.gap_order} correct={lastResult.passed}>
                  <Text style={styles.struck}>{answer.user_word}</Text>
                  {'  →  '}
                  <Text style={styles.bold}>{answer.correct_word}</Text>
                </ResultText>
              ))}
            </>
          ) : null}
        </ResultBar>
      ) : null}

      <ConfirmSheet
        visible={confirmExit}
        title="Sair da fase?"
        text={`O progresso só é guardado quando você termina os ${total} desafios. Se sair agora, vai recomeçar a fase.`}
        stayLabel="Continuar jogando"
        leaveLabel="Sair mesmo assim"
        onStay={() => setConfirmExit(false)}
        onLeave={() => {
          setConfirmExit(false);
          navigation.goBack();
        }}
      />
      <LevelUpOverlay levelUp={levelUp} onDone={() => setLevelUp(null)} isDark={isDark} />
      <ConfettiView />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 15, textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  active: { paddingVertical: 16 },
  lives: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  livesText: { color: colors.red[500], fontWeight: '800', fontSize: 16 },
  struck: { textDecorationLine: 'line-through', opacity: 0.7 },
  bold: { fontWeight: '800' },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { playApi, type PhaseDetail, type ActiveSegment, type CompletedSegment, type SegmentAnswer } from '../../api/play';
import { useUserStore } from '../../stores/userStore';
import { GameButton } from '../../components/ui/GameButton';
import { AppHeader } from '../../components/layout/AppHeader';
import { ActiveChallenge } from '../../components/game/ActiveChallenge';
import { CompletedSegmentView } from '../../components/game/CompletedSegment';
import { PhaseControls } from '../../components/game/PhaseControls';
import { XpGainPopup } from '../../components/game/XpGainPopup';
import { LostLifeToast } from '../../components/game/LostLifeToast';
import { useConfetti } from '../../hooks/useConfetti';
import { useSuccessSound } from '../../hooks/useSuccessSound';
import { colors } from '../../theme/colors';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Props = NativeStackScreenProps<PlayStackParamList, 'PlayPhase'>;

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert('', message);
  }
}

export function PlayPhaseScreen({ route, navigation }: Props) {
  const { phaseId } = route.params;
  const queryClient = useQueryClient();
  const { updateFromApi } = useUserStore();

  const { data, isLoading, error } = useQuery<PhaseDetail>({
    queryKey: ['phase', phaseId],
    queryFn: async () => (await playApi.getPhaseDetail(phaseId)).data,
  });

  // Estado de gameplay (deriva do payload inicial e evolui localmente após submits)
  const [completed, setCompleted] = useState<CompletedSegment[]>([]);
  const [active, setActive] = useState<ActiveSegment | null>(null);
  const [hasMoreAbove, setHasMoreAbove] = useState(false);
  const [phaseBlockUuids, setPhaseBlockUuids] = useState<string[]>([]);
  const [legislationUuid, setLegislationUuid] = useState<string>('');

  const [userSelections, setUserSelections] = useState<Record<number, string>>({});
  const [verified, setVerified] = useState(false);
  const [verificationResults, setVerificationResults] = useState<SegmentAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [xpAmount, setXpAmount] = useState<number | null>(null);
  const [xpKey, setXpKey] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lostLifeMessage, setLostLifeMessage] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const activeYRef = useRef<number>(0);
  const oldContentHeightRef = useRef<number | null>(null);
  const oldScrollYRef = useRef<number>(0);
  const initialScrollDoneRef = useRef(false);
  // Flag explícita para scroll suave somente quando o usuário avança de segmento
  // (NÃO deve disparar quando o ativo é re-laid-out por causa do prepend infinite-up)
  const pendingAdvanceScrollRef = useRef(false);

  const { ConfettiView, fire: fireConfetti } = useConfetti();
  const { play: playWinSound } = useSuccessSound();

  // Inicializar estado quando o payload chega
  useEffect(() => {
    if (!data) return;
    setCompleted(data.completedSegments ?? []);
    setActive(data.activeSegment);
    setHasMoreAbove(data.hasMoreAbove);
    setPhaseBlockUuids(data.phaseBlockUuids ?? []);
    setLegislationUuid(data.legislation.uuid);
    if (data.user) updateFromApi(data.user);
    setShowCompletion(data.allComplete);
  }, [data?.phaseId]);

  // Reset de estado de respostas quando o segmento ativo muda
  useEffect(() => {
    setUserSelections({});
    setVerified(false);
    setVerificationResults([]);
    initialScrollDoneRef.current = false;
  }, [active?.uuid]);

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

  /* ===== Ações do jogador ===== */
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

  /* ===== Submit ===== */
  const handleVerify = useCallback(async () => {
    if (!active || !allFilled || verified || isSubmitting) return;

    const answers: SegmentAnswer[] = active.lacunas.map((l) => ({
      gap_order: l.gap_order,
      word_position: l.word_position,
      correct_word: l.word,
      user_word: userSelections[l.gap_order] ?? '',
      is_correct: userSelections[l.gap_order] === l.word,
    }));
    const correctCount = answers.filter((a) => a.is_correct).length;

    setVerified(true);
    setVerificationResults(answers);
    setIsSubmitting(true);

    try {
      const res = await playApi.submitSegment({
        segment_uuid: active.uuid,
        answers,
        correct_count: correctCount,
        total_count: answers.length,
        phase_block_uuids: phaseBlockUuids.length ? phaseBlockUuids : undefined,
      });
      const r = res.data;

      // Sincroniza HUD
      if (r.user) updateFromApi(r.user);

      const passed = r.progress.percentage >= 70;

      if (passed) {
        // Feedback sensorial
        fireConfetti();
        playWinSound();
        if (r.xp_gained > 0) {
          setXpAmount(r.xp_gained);
          setXpKey((k) => k + 1);
        }

        // Aguardar 1.5s para o jogador ler o resultado
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Empurrar o segmento ativo (com respostas) para o histórico
        setCompleted((prev) => {
          const archived: CompletedSegment = {
            uuid: active.uuid,
            original_text: active.original_text,
            position: active.position,
            article_reference: active.article_reference,
            structural_marker: active.structural_marker,
            segment_type: active.segment_type,
            answers: r.answers,
            is_completed: r.progress.is_completed,
            best_score: r.progress.best_score,
          };
          return [...prev, archived];
        });

        if (r.next_segment) {
          // Sinaliza para handleActiveLayout fazer scroll suave UMA vez quando
          // o novo ativo for laid-out
          pendingAdvanceScrollRef.current = true;
          setActive(r.next_segment);
        } else {
          setActive(null);
          setShowCompletion(true);
        }

        // Invalida o mapa para refletir progresso lá
        queryClient.invalidateQueries({ queryKey: ['play-map'] });
      } else {
        setLostLifeMessage(
          `Você precisa acertar pelo menos 70%. Acertou ${correctCount} de ${answers.length}.`,
        );
        // Reset depois de breve display do erro
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setUserSelections({});
        setVerified(false);
        setVerificationResults([]);

        if (r.should_redirect) {
          // Vidas zeraram — voltar ao mapa por ora
          navigation.goBack();
        }
      }
    } catch (e) {
      showToast('Erro ao enviar resposta. Tente novamente.');
      setVerified(false);
      setVerificationResults([]);
    } finally {
      setIsSubmitting(false);
    }
  }, [active?.uuid, allFilled, verified, isSubmitting, userSelections, phaseBlockUuids]);

  /* ===== Scroll infinito para cima ===== */
  const loadMoreAbove = useCallback(async () => {
    if (isLoadingMore || !hasMoreAbove || completed.length === 0 || !legislationUuid) return;
    setIsLoadingMore(true);
    const beforePosition = completed[0]?.position ?? 0;

    try {
      const res = await playApi.loadMoreAbove(phaseId, legislationUuid, beforePosition, 5);
      const { segments, hasMore } = res.data;
      if (segments.length > 0) {
        setCompleted((prev) => [...segments, ...prev]);
      }
      setHasMoreAbove(hasMore);
    } catch {
      // silently fail
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreAbove, completed, legislationUuid, phaseId]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (y < 60 && hasMoreAbove && !isLoadingMore && completed.length > 0) {
        // Snapshot da altura e posição antes do prepend para preservar posição visual
        oldContentHeightRef.current = e.nativeEvent.contentSize.height;
        oldScrollYRef.current = y;
        loadMoreAbove();
      }
    },
    [hasMoreAbove, isLoadingMore, completed.length, loadMoreAbove],
  );

  const handleContentSizeChange = useCallback(
    (_w: number, newHeight: number) => {
      // Após prepend: ajusta scrollY para oldScrollY + delta, mantendo a posição visual
      if (oldContentHeightRef.current != null && oldContentHeightRef.current > 0) {
        const delta = newHeight - oldContentHeightRef.current;
        if (delta > 0) {
          const targetY = oldScrollYRef.current + delta;
          scrollRef.current?.scrollTo({ y: targetY, animated: false });
        }
        oldContentHeightRef.current = null;
        oldScrollYRef.current = 0;
        return;
      }

      // Scroll inicial para o segmento ativo (apenas uma vez por segmento)
      if (!initialScrollDoneRef.current && active && activeYRef.current > 0) {
        // requestAnimationFrame garante que o scroll acontece após o layout estabilizar
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ y: activeYRef.current, animated: false });
          initialScrollDoneRef.current = true;
        });
      }
    },
    [active?.uuid],
  );

  const handleActiveLayout = useCallback((y: number) => {
    activeYRef.current = y;

    // Avanço explícito para o próximo segmento: scroll suave UMA vez
    if (pendingAdvanceScrollRef.current) {
      pendingAdvanceScrollRef.current = false;
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y, animated: true });
      });
      return;
    }

    // Scroll inicial (primeira montagem da fase): instantâneo, UMA vez
    if (!initialScrollDoneRef.current) {
      requestAnimationFrame(() => {
        if (initialScrollDoneRef.current) return;
        scrollRef.current?.scrollTo({ y, animated: false });
        initialScrollDoneRef.current = true;
      });
      return;
    }

    // Re-layout do ativo (ex: prepend de completed acima) — NÃO scroll.
    // O preserve de posição é tratado em handleContentSizeChange.
  }, []);

  /* ===== Render ===== */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.purple[500]} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorTitle}>Não foi possível carregar a fase</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.errorBack}
        >
          <Text style={styles.errorBackText}>← Voltar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isCompletePhase = !active && showCompletion;
  const progressLabel = `${data.progress.current}/${data.progress.total}`;

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />

      <View style={styles.phaseHeader}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.gray[600]} />
        </Pressable>
        <View style={styles.phaseInfo}>
          <Text style={styles.phaseName} numberOfLines={1}>
            {data.legislation.title}
          </Text>
          {active && (
            <Text style={styles.referenceText} numberOfLines={1}>
              Art. {active.article_reference}
              {active.structural_marker ? ` — ${active.structural_marker}` : ''}
            </Text>
          )}
        </View>
        <Text style={styles.progress}>{progressLabel}</Text>
      </View>

      <View style={styles.scrollWrapper}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={32}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
        >
        {completed.map((seg) => (
          <CompletedSegmentView key={seg.uuid} segment={seg} />
        ))}

        {active && (
          <ActiveChallenge
            segment={active}
            userSelections={userSelections}
            verified={verified}
            verificationResults={verificationResults}
            onUnselect={unselectGap}
            onLayout={handleActiveLayout}
          />
        )}

        {isCompletePhase && (
          <View style={styles.completionCard}>
            <Text style={styles.completionEmoji}>🏆</Text>
            <Text style={styles.completionTitle}>Fase concluída!</Text>
            <Text style={styles.completionText}>
              Você completou todos os blocos desta fase.
            </Text>
            <View style={styles.completionActions}>
              <GameButton variant="white" size="md" onPress={() => navigation.goBack()}>
                Voltar ao mapa
              </GameButton>
              {data.nextPhaseId != null && (
                <GameButton
                  variant="green"
                  size="md"
                  onPress={() => navigation.replace('PlayPhase', { phaseId: data.nextPhaseId! })}
                >
                  Próxima fase →
                </GameButton>
              )}
            </View>
          </View>
        )}
        </ScrollView>

        {isLoadingMore && (
          <View pointerEvents="none" style={styles.spinnerOverlay}>
            <ActivityIndicator color={colors.purple[500]} />
          </View>
        )}
      </View>

      {active && (
        <PhaseControls
          options={availableOptions}
          hasLacunas={active.lacunas.length > 0}
          allFilled={allFilled}
          verified={verified}
          isSubmitting={isSubmitting}
          isLastSegment={false}
          onSelect={fillNextEmpty}
          onClear={clearAll}
          onVerify={handleVerify}
          onNext={() => {}}
        />
      )}

      <XpGainPopup key={xpKey} amount={xpAmount} onDone={() => setXpAmount(null)} />
      <ConfettiView />
      <LostLifeToast
        visible={lostLifeMessage !== null}
        message={lostLifeMessage ?? ''}
        onHide={() => setLostLifeMessage(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: colors.gray[700], marginBottom: 16 },
  errorBack: { backgroundColor: colors.purple[500], paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  errorBackText: { color: '#fff', fontWeight: '700' },

  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  backBtn: { padding: 4 },
  phaseInfo: { flex: 1 },
  phaseName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  referenceText: { fontSize: 12, color: colors.mutedForeground },
  progress: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground },

  scrollWrapper: { flex: 1, position: 'relative' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },

  spinnerOverlay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },

  completionCard: {
    marginTop: 24,
    padding: 24,
    borderRadius: 16,
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[100],
    alignItems: 'center',
    gap: 12,
  },
  completionEmoji: { fontSize: 48 },
  completionTitle: { fontSize: 22, fontWeight: '800', color: colors.green[700] },
  completionText: { fontSize: 14, color: colors.gray[600], textAlign: 'center' },
  completionActions: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
});

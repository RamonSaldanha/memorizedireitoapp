import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Pressable, Modal, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight, X, CheckCircle, XCircle } from 'lucide-react-native';
import { apiClient } from '../../api/client';
import { useUserStore } from '../../stores/userStore';
import { GameButton } from '../../components/ui/GameButton';
import { AppHeader } from '../../components/layout/AppHeader';
import { colors } from '../../theme/colors';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Props = NativeStackScreenProps<PlayStackParamList, 'PlayPhase'>;

/* ========== Tipos da API de Produção ========== */
type Lacuna = {
  gap_order: number;
  word: string;
  word_position: number;
};

type ActiveSegment = {
  uuid: string;
  original_text: string;
  article_reference: string;
  structural_marker: string;
  lacunas: Lacuna[];
  options: string[];
  total_gaps: number;
};

type CompletedSegment = {
  uuid: string;
  original_text: string;
  article_reference: string;
  structural_marker: string;
  answers: {
    gap_order: number;
    correct_word: string;
    user_word: string;
    is_correct: boolean;
  }[];
  is_completed: boolean;
  best_score: number;
};

type PhaseDetail = {
  legislation: { uuid: string; title: string };
  completedSegments: CompletedSegment[];
  activeSegment: ActiveSegment;
  progress: { current: number; total: number; percentage: number };
  hasMoreAbove: boolean;
  allComplete: boolean;
  phaseId: number;
  nextPhaseId: number | null;
  phaseBlockUuids: string[];
  user: { lives: number; has_infinite_lives: boolean; xp: number };
};

/* ========== Helpers ========== */
function buildPracticeText(originalText: string, lacunas: Lacuna[]): string {
  const words = originalText.split(/\s+/);
  // Ordenar lacunas por posição decrescente para não deslocar índices
  const sorted = [...lacunas].sort((a, b) => b.word_position - a.word_position);
  sorted.forEach((l) => {
    words[l.word_position] = '____';
  });
  return words.join(' ');
}

type Seg = { type: 'text'; value: string } | { type: 'slot'; index: number };

function parseContent(content: string): Seg[] {
  const segments: Seg[] = [];
  const parts = content.split('____');
  parts.forEach((part, i) => {
    if (part) segments.push({ type: 'text', value: part });
    if (i < parts.length - 1) segments.push({ type: 'slot', index: i });
  });
  return segments;
}

/* ========== Componente: SegmentPractice ========== */
function SegmentPractice({
  segment,
  answers,
  onAnswer,
  verified,
}: {
  segment: ActiveSegment;
  answers: string[];
  onAnswer: (slotIndex: number, word: string) => void;
  verified: boolean;
}) {
  const practiceText = buildPracticeText(segment.original_text, segment.lacunas);
  const segs = parseContent(practiceText);
  const sortedLacunas = [...segment.lacunas].sort((a, b) => a.gap_order - b.gap_order);

  return (
    <View style={spStyles.container}>
      {/* Texto com lacunas */}
      <View style={spStyles.textWrap}>
        {segs.map((seg, i) => {
          if (seg.type === 'text') {
            return <Text key={i} style={spStyles.bodyText}>{seg.value}</Text>;
          }
          const filled = answers[seg.index];
          const correctWord = sortedLacunas[seg.index]?.word;
          const isCorrect = verified && filled === correctWord;
          const isWrong = verified && filled && filled !== correctWord;

          return (
            <Pressable
              key={i}
              onPress={() => {
                if (verified) return;
                onAnswer(seg.index, '');
              }}
              style={[
                spStyles.slot,
                filled && spStyles.slotFilled,
                isCorrect && spStyles.slotCorrect,
                isWrong && spStyles.slotWrong,
              ]}
            >
              <Text
                style={[
                  spStyles.slotText,
                  filled && spStyles.slotTextFilled,
                  isCorrect && spStyles.slotTextCorrect,
                  isWrong && spStyles.slotTextWrong,
                ]}
              >
                {filled ?? '    '}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Pills de opções */}
      {!verified && (
        <View style={spStyles.optionsWrap}>
          {segment.options.map((opt, idx) => {
            const usedInSlot = answers.indexOf(opt) >= 0;
            return (
              <Pressable
                key={`${opt}-${idx}`}
                style={[spStyles.pill, usedInSlot && spStyles.pillUsed]}
                onPress={() => {
                  if (usedInSlot) {
                    const slotIdx = answers.indexOf(opt);
                    onAnswer(slotIdx, '');
                  } else {
                    const nextEmpty = answers.findIndex((a) => !a);
                    const target = nextEmpty >= 0 ? nextEmpty : answers.length;
                    if (target < segment.total_gaps) {
                      onAnswer(target, opt);
                    }
                  }
                }}
              >
                <Text style={[spStyles.pillText, usedInSlot && spStyles.pillTextUsed]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Feedback após verificar */}
      {verified && (
        <View style={spStyles.feedbackWrap}>
          {answers.every((a, i) => a === sortedLacunas[i]?.word) ? (
            <View style={spStyles.feedbackRow}>
              <CheckCircle size={20} color={colors.green[500]} />
              <Text style={spStyles.feedbackCorrect}>Parabéns! Todas as lacunas estão corretas.</Text>
            </View>
          ) : (
            <View>
              <View style={spStyles.feedbackRow}>
                <XCircle size={20} color={colors.red[500]} />
                <Text style={spStyles.feedbackWrong}>Algumas lacunas estão incorretas.</Text>
              </View>
              <View style={{ marginTop: 8, gap: 4 }}>
                {answers.map((a, i) => {
                  const correct = sortedLacunas[i]?.word;
                  if (a !== correct) {
                    return (
                      <Text key={i} style={spStyles.feedbackHint}>
                        Lacuna {i + 1}: correta seria "{correct}"
                      </Text>
                    );
                  }
                  return null;
                })}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/* ========== Screen ========== */
export function PlayPhaseScreen({ route, navigation }: Props) {
  const { phaseId } = route.params;
  const queryClient = useQueryClient();
  const { updateFromApi } = useUserStore();

  const [answers, setAnswers] = useState<string[]>([]);
  const [verified, setVerified] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<{ correct: number; total: number; xpGained: number; lostLife: boolean } | null>(null);

  const { data, isLoading } = useQuery<PhaseDetail>({
    queryKey: ['phase', phaseId],
    queryFn: async () => {
      const res = await apiClient.get(`/play/phases/${phaseId}`);
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { segment_uuid: string; correct_answers: number; total_answers: number }) =>
      apiClient.post('/play/progress', payload),
    onSuccess: (res: any) => {
      const d = res.data;
      if (d?.user) updateFromApi(d.user);
      setResult({
        correct: d?.progress?.percentage ?? 0,
        total: 100,
        xpGained: d?.xp_gained ?? 0,
        lostLife: d?.lost_life ?? false,
      });
      setShowModal(true);
      queryClient.invalidateQueries({ queryKey: ['play-map'] });
    },
  });

  const segment = data?.activeSegment;
  const progress = data?.progress;
  const legislation = data?.legislation;

  React.useEffect(() => {
    if (segment) {
      setAnswers(new Array(segment.total_gaps).fill(''));
      setVerified(false);
    }
  }, [segment?.uuid]);

  const handleVerify = () => {
    if (!segment) return;
    const sortedLacunas = [...segment.lacunas].sort((a, b) => a.gap_order - b.gap_order);
    const correct = answers.filter((a, i) => a === sortedLacunas[i]?.word).length;
    const total = segment.total_gaps;
    setVerified(true);

    saveMutation.mutate({
      segment_uuid: segment.uuid,
      correct_answers: correct,
      total_answers: total,
    });
  };

  const handleNext = () => {
    setShowModal(false);
    setResult(null);
    setVerified(false);
    if (data?.nextPhaseId) {
      navigation.replace('PlayPhase', { phaseId: data.nextPhaseId });
    } else {
      navigation.goBack();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.purple[500]} size="large" />
      </SafeAreaView>
    );
  }

  if (!segment) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Segmento não encontrado</Text>
        <Text style={{ fontSize: 14, color: colors.gray[500] }}>
          Fase: {phaseId} | Data: {data ? 'OK' : 'null'}
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={{ backgroundColor: colors.purple[500], padding: 12, borderRadius: 8, marginTop: 16 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>← Voltar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const allFilled = answers.every((a) => !!a);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />

      {/* Header */}
      <View style={styles.phaseHeader}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.gray[600]} />
        </Pressable>
        <View style={styles.phaseInfo}>
          <Text style={styles.phaseName}>{legislation?.title ?? 'Fase'}</Text>
          <Text style={styles.referenceText}>Art. {segment.article_reference} — {segment.structural_marker}</Text>
        </View>
        <Text style={styles.progress}>{progress?.current ?? 0}/{progress?.total ?? 0}</Text>
      </View>

      {/* Conteúdo */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <SegmentPractice
          segment={segment}
          answers={answers}
          onAnswer={(idx, word) => {
            setAnswers((prev) => {
              const next = [...prev];
              next[idx] = word;
              return next;
            });
          }}
          verified={verified}
        />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {!verified ? (
          <GameButton
            variant="green"
            size="md"
            fullWidth
            onPress={handleVerify}
            disabled={!allFilled || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Verificando...' : 'Verificar'}
          </GameButton>
        ) : (
          <GameButton
            variant="blue"
            size="md"
            fullWidth
            onPress={handleNext}
          >
            {data?.nextPhaseId ? 'Próxima fase →' : 'Concluir'}
          </GameButton>
        )}
      </View>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => {}}>
          <View style={styles.modalContent}>
            <Pressable style={styles.modalClose} onPress={handleNext}>
              <X size={20} color={colors.gray[500]} />
            </Pressable>

            {result && (
              <>
                <Text style={styles.modalTitle}>
                  {result.xpGained > 0 ? '🎉 Correto!' : 'Continue tentando'}
                </Text>
                {result.xpGained > 0 && (
                  <View style={styles.xpBadge}>
                    <Text style={styles.xpBadgeText}>+{result.xpGained} XP</Text>
                  </View>
                )}
                {result.lostLife && (
                  <Text style={styles.lostLifeText}>❤️ Você perdeu uma vida</Text>
                )}
              </>
            )}

            <GameButton variant="blue" size="lg" fullWidth onPress={handleNext}>
              {data?.nextPhaseId ? 'Próxima fase →' : 'Concluir'}
            </GameButton>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* ========== Styles ========== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
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
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalClose: { position: 'absolute', top: 16, right: 16, padding: 4 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.foreground, textAlign: 'center' },
  xpBadge: {
    backgroundColor: colors.purple[100],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  xpBadgeText: { fontSize: 18, fontWeight: '800', color: colors.purple[600] },
  lostLifeText: { fontSize: 14, color: colors.red[500], textAlign: 'center' },
});

const spStyles = StyleSheet.create({
  container: { gap: 20 },
  textWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.gray[50],
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bodyText: { fontSize: 15, color: colors.foreground, lineHeight: 24 },
  slot: {
    borderBottomWidth: 2,
    borderBottomColor: colors.blue[500],
    minWidth: 60,
    paddingHorizontal: 4,
    marginHorizontal: 2,
    minHeight: 24,
    justifyContent: 'center',
  },
  slotFilled: {
    backgroundColor: colors.blue[50],
    borderRadius: 4,
    borderBottomWidth: 0,
  },
  slotCorrect: { backgroundColor: colors.green[50], borderBottomColor: colors.green[500] },
  slotWrong: { backgroundColor: colors.red[50], borderBottomColor: colors.red[500] },
  slotText: { fontSize: 14, color: colors.gray[400], textAlign: 'center' },
  slotTextFilled: { color: colors.blue[700], fontWeight: '700' },
  slotTextCorrect: { color: colors.green[700] },
  slotTextWrong: { color: colors.red[700] },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: colors.blue[500],
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: colors.blue[700],
  },
  pillUsed: {
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[300],
  },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pillTextUsed: { color: colors.gray[400] },
  feedbackWrap: {
    backgroundColor: colors.gray[50],
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedbackCorrect: { fontSize: 15, fontWeight: '700', color: colors.green[600] },
  feedbackWrong: { fontSize: 15, fontWeight: '700', color: colors.red[600] },
  feedbackHint: { fontSize: 13, color: colors.gray[600] },
});

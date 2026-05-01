import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Pressable, Modal, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { playApi, Article } from '../../api/play';
import { useUserStore } from '../../stores/userStore';
import { GameButton } from '../../components/ui/GameButton';
import { PracticeContent } from '../../components/game/PracticeContent';
import { AppHeader } from '../../components/layout/AppHeader';
import { colors } from '../../theme/colors';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Props = NativeStackScreenProps<PlayStackParamList, 'PlayPhase'>;

export function PlayPhaseScreen({ route, navigation }: Props) {
  const { phaseId } = route.params;
  const queryClient = useQueryClient();
  const { updateFromApi } = useUserStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [result, setResult] = useState<{ correct: number; total: number; xpGained: number; lostLife: boolean } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['phase', phaseId],
    queryFn: () => playApi.getPhase(phaseId),
    select: (res) => res.data,
  });

  const saveMutation = useMutation({
    mutationFn: ({ articleUuid, correct, total }: { articleUuid: string; correct: number; total: number }) =>
      playApi.saveProgress(articleUuid, correct, total),
    onSuccess: (res) => {
      const d = res.data;
      updateFromApi(d.user);
      setResult({
        correct: d.progress?.percentage ?? 0,
        total: 100,
        xpGained: d.xp_gained,
        lostLife: d.lost_life,
      });
      setShowModal(true);
      // Invalidar mapa para refletir progresso
      queryClient.invalidateQueries({ queryKey: ['play-map'] });
    },
  });

  const articles = data?.articles ?? [];
  const phase = data?.phase;
  const currentArticle: Article | undefined = articles[currentIndex];

  const handleVerify = useCallback(() => {
    if (!currentArticle) return;
    const articleAnswers = answers[currentIndex] ?? [];
    const correctOptions = currentArticle.options.filter((o) => o.is_correct);
    const correct = correctOptions.filter((o, i) => o.word === articleAnswers[i]).length;
    const total = correctOptions.length || 1;
    saveMutation.mutate({
      articleUuid: currentArticle.uuid,
      correct,
      total,
    });
  }, [currentArticle, answers, currentIndex]);

  const handleNext = () => {
    setShowModal(false);
    setResult(null);
    if (currentIndex < articles.length - 1) {
      setCurrentIndex((i) => i + 1);
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

  if (!currentArticle) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Artigo não encontrado</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />

      {/* Header da fase */}
      <View style={styles.phaseHeader}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.gray[600]} />
        </Pressable>
        <View style={styles.phaseInfo}>
          <Text style={styles.phaseName}>{phase?.title}</Text>
          <Text style={styles.referenceText}>{phase?.reference_name}</Text>
        </View>
        <Text style={styles.progress}>{currentIndex + 1}/{articles.length}</Text>
      </View>

      {/* Artigo atual */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.articleRef}>Art. {currentArticle.article_reference}</Text>

        <PracticeContent
          content={currentArticle.practice_content}
          options={currentArticle.options}
          answers={answers[currentIndex] ?? []}
          onAnswer={(slotIndex, word) => {
            setAnswers((prev) => {
              const current = [...(prev[currentIndex] ?? [])];
              current[slotIndex] = word;
              return { ...prev, [currentIndex]: current };
            });
          }}
        />
      </ScrollView>

      {/* Navegação entre artigos */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={24} color={currentIndex === 0 ? colors.gray[300] : colors.gray[600]} />
        </Pressable>

        <GameButton
          variant="green"
          size="md"
          onPress={handleVerify}
          disabled={saveMutation.isPending}
          style={styles.verifyBtn}
        >
          {saveMutation.isPending ? 'Verificando...' : 'Verificar'}
        </GameButton>

        <Pressable
          style={[styles.navBtn, currentIndex === articles.length - 1 && styles.navBtnDisabled]}
          onPress={() => setCurrentIndex((i) => Math.min(articles.length - 1, i + 1))}
          disabled={currentIndex === articles.length - 1}
        >
          <ChevronRight size={24} color={currentIndex === articles.length - 1 ? colors.gray[300] : colors.gray[600]} />
        </Pressable>
      </View>

      {/* Modal de resultado */}
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

            <GameButton
              variant={result?.xpGained ? 'green' : 'blue'}
              size="lg"
              fullWidth
              onPress={handleNext}
            >
              {currentIndex < articles.length - 1 ? 'Próximo artigo →' : 'Concluir fase'}
            </GameButton>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  articleRef: { fontSize: 13, fontWeight: '700', color: colors.purple[500], marginBottom: 4 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: 8,
  },
  navBtn: { padding: 8 },
  navBtnDisabled: { opacity: 0.3 },
  verifyBtn: { flex: 1 },
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

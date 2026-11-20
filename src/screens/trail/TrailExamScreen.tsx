import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Timer, X, Zap } from 'lucide-react-native';
import type { DisciplineLevelUp } from '../../api/play';
import {
  boardLabel,
  trailApi,
  type ExamAttempt,
  type ExamGiven,
  type ExamResponse,
  type ExamResult,
} from '../../api/trail';
import { ChoiceList, ConfirmSheet, ResultBar, ResultText, TrailTopBar } from '../../components/trail/TrailUi';
import { LevelUpOverlay } from '../../components/game/LevelUpOverlay';
import { GameButton } from '../../components/ui/GameButton';
import { useConfetti } from '../../hooks/useConfetti';
import { useGameSounds } from '../../hooks/useGameSounds';
import { useAppearance } from '../../hooks/useAppearance';
import { useUserStore } from '../../stores/userStore';
import { colors } from '../../theme/colors';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Props = NativeStackScreenProps<PlayStackParamList, 'TrailExam'>;

export function TrailExamScreen({ route, navigation }: Props) {
  const { theme } = useAppearance();
  const { data, error, refetch } = useQuery({
    queryKey: ['trail-exam', route.params.key],
    queryFn: async () => (await trailApi.exam(route.params.key)).data,
    gcTime: 0,
    retry: false,
  });

  if (!data) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        {error ? (
          <>
            <Text style={[styles.message, { color: theme.foreground }]}>Não foi possível abrir a prova.</Text>
            <GameButton variant="purple" onPress={() => navigation.goBack()}>
              Voltar ao mapa
            </GameButton>
          </>
        ) : (
          <ActivityIndicator color={colors.purple[500]} size="large" />
        )}
      </SafeAreaView>
    );
  }

  return <Exam data={data} onExit={() => navigation.goBack()} reload={refetch} />;
}

function clock(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function duration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return [minutes > 0 ? `${minutes} min` : '', rest > 0 ? `${rest} s` : ''].filter(Boolean).join(' ');
}

const answerLabel = (item: { type: string; options: Record<string, string> | null }, key: string) =>
  item.type === 'true_false'
    ? key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()
    : `${key.toUpperCase()}) ${item.options?.[key.toUpperCase()] ?? ''}`;

/**
 * Dia da prova, como o da web (BetaPlay/Exam.vue): uma prova com tempo, só com questões que a
 * pessoa já viu nos desafios dos quadrados da etapa. Quem manda no tempo é o servidor; o
 * relógio daqui só mostra, e ao voltar para o app a tela pergunta de novo quanto resta.
 * Errar não custa nada; o XP somado aparece ao lado do relógio e é creditado na entrega.
 */
function Exam({ data, onExit, reload }: { data: ExamResponse; onExit: () => void; reload: () => Promise<{ data?: ExamResponse }> }) {
  const { exam } = data;
  const { isDark, theme } = useAppearance();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const updateFromApi = useUserStore((s) => s.updateFromApi);
  const { ConfettiView, fire: fireConfetti } = useConfetti();
  const { playPhaseComplete } = useGameSounds();

  const [stage, setStage] = useState<'intro' | 'playing' | 'result'>('intro');
  const [running, setRunning] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, ExamGiven>>({});
  const [index, setIndex] = useState(0);
  const [xp, setXp] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [feedback, setFeedback] = useState<ExamGiven | null>(null);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [levelUp, setLevelUp] = useState<DisciplineLevelUp | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  /* ===== Relógio ===== */
  const [secondsLeft, setSecondsLeft] = useState(0);
  const endsAt = useRef(0);
  const ticker = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const finishing = useRef(false);

  const stopClock = () => {
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = undefined;
  };

  const startClock = (seconds: number) => {
    stopClock();
    endsAt.current = Date.now() + seconds * 1000;
    setSecondsLeft(seconds);
    ticker.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        setTimedOut(true);
        finishRef.current();
      }
    }, 250);
  };

  useEffect(() => stopClock, []);

  const questions = running?.questions ?? [];
  const question = questions[index];
  const answeredCount = Object.keys(answers).length;

  const enter = (attempt: ExamAttempt) => {
    setRunning(attempt);
    setAnswers({ ...attempt.answers });
    setXp(attempt.xp);
    // Volta na primeira questão ainda sem resposta
    const next = attempt.questions.findIndex((item) => !(item.uuid in attempt.answers));
    setIndex(next === -1 ? 0 : next);
    setSelected(null);
    setFeedback(null);
    setResult(null);
    setTimedOut(false);
    setStage('playing');
    startClock(attempt.seconds_left);
  };

  // Prova em andamento ao abrir a tela
  useEffect(() => {
    if (data.attempt) enter(data.attempt);
  }, []);

  const showResult = (done: ExamResult) => {
    stopClock();
    setResult(done);
    setXp(done.xp_gained);
    const user = useUserStore.getState();
    updateFromApi({ lives: user.lives, has_infinite_lives: user.hasInfiniteLives, xp: done.user.xp });
    setLevelUp(done.discipline_level_up);
    setConfirmingExit(false);
    setStage('result');
    queryClient.invalidateQueries({ queryKey: ['trail-map'] });
    queryClient.invalidateQueries({ queryKey: ['disciplines'] });
    if (done.correct > 0) {
      fireConfetti();
      playPhaseComplete();
    }
  };

  /** Entrega a prova: o tempo acabou ou a pessoa decidiu parar. */
  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    stopClock();
    try {
      const { data: done } = await trailApi.finishExam(exam.key);
      showResult(done);
    } catch {
      // Sem conexão: o servidor entrega sozinho quando a pessoa abrir a prova de novo
      onExit();
    } finally {
      finishing.current = false;
    }
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // O relógio do aparelho para quando o app sai da tela; o do servidor, não. Ao voltar,
  // pergunta de novo quanto resta (ou recebe o resultado, se o prazo venceu)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (next) => {
      if (next !== 'active' || stage !== 'playing') return;
      try {
        const fresh = (await reload()).data;
        if (fresh?.attempt) {
          endsAt.current = Date.now() + fresh.attempt.seconds_left * 1000;
          setXp(fresh.attempt.xp);
        } else {
          finishRef.current();
        }
      } catch {
        // Continua com o relógio daqui
      }
    });
    return () => subscription.remove();
  }, [stage]);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setStartError(false);
    try {
      const { data: attempt } = await trailApi.startExam(exam.key);
      enter(attempt);
    } catch {
      setStartError(true);
    } finally {
      setStarting(false);
    }
  };

  const check = async () => {
    if (!question || !selected || checking || stage !== 'playing') return;
    setChecking(true);
    setCheckError(false);
    try {
      const { data: response } = await trailApi.answerExam(exam.key, question.uuid, selected);
      const given = { answer: selected, is_correct: response.is_correct, correct_answer: response.correct_answer };
      setAnswers((prev) => ({ ...prev, [question.uuid]: given }));
      setXp(response.xp);
      setFeedback(given);
      // Última questão: a prova já foi entregue; o resultado aparece depois do "Continuar"
      if (response.result) {
        stopClock();
        setResult(response.result);
      }
    } catch (error) {
      // O tempo acabou antes de a resposta chegar: o servidor já entregou a prova
      const response = (error as { response?: { status?: number; data?: { result?: ExamResult } } }).response;
      if (response?.status === 409 && response.data?.result) {
        setTimedOut(true);
        showResult(response.data.result);
      } else {
        setCheckError(true);
      }
    } finally {
      setChecking(false);
    }
  };

  const advance = () => {
    if (result) {
      showResult(result);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setFeedback(null);
    setCheckError(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const muted = isDark ? colors.gray[400] : colors.gray[500];
  const strong = isDark ? '#fff' : colors.gray[900];
  const border = isDark ? colors.gray[700] : colors.gray[200];

  /* ===== Antes de começar ===== */
  if (stage === 'intro') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.introContent}>
          <View style={styles.introBody}>
            <View style={styles.introIcon}>
              <Timer size={32} color="#fff" strokeWidth={2.5} />
            </View>
            <Text style={[styles.introTitle, { color: strong }]}>Dia da prova</Text>
            <Text style={[styles.introSub, { color: muted }]}>
              Etapa {exam.section_number} · {exam.legislation_title}
            </Text>

            <View style={[styles.facts, { borderColor: border }]}>
              <Fact label="Questões" value={String(exam.questions)} />
              <Fact label="Tempo" value={duration(exam.seconds)} border={border} />
              <Fact label="Cada acerto" value={`+${exam.xp_per_correct} XP`} border={border} color={isDark ? colors.purple[400] : colors.purple[600]} />
              {exam.attempts > 0 ? (
                <Fact label="Seu melhor resultado" value={`${exam.best_correct} de ${exam.questions}`} border={border} color={isDark ? '#4ade80' : colors.green[600]} />
              ) : null}
            </View>

            <Text style={[styles.introText, { color: muted }]}>
              São as questões que você já viu nos desafios desta etapa, em outra ordem. Vá o mais longe que conseguir: errar não tira nada, e o
              tempo não para se você sair da prova.
            </Text>
            {exam.attempts > 0 ? (
              <Text style={[styles.introText, { color: muted, marginTop: 8 }]}>Ao refazer, só dão XP as questões que você ainda não tinha acertado.</Text>
            ) : null}
          </View>

          {startError ? <Text style={styles.error}>Não foi possível começar agora. Tente de novo.</Text> : null}
          <GameButton variant="purple" size="lg" fullWidth disabled={starting} onPress={start}>
            Começar a prova
          </GameButton>
          <GameButton variant="white" size="lg" fullWidth isDark={isDark} onPress={onExit} style={{ marginTop: 12 }}>
            Voltar ao mapa
          </GameButton>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ===== Resultado ===== */
  if (stage === 'result' && result) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.resultContent}>
          <Text style={[styles.resultTitle, { color: strong }]}>{timedOut ? 'Tempo esgotado!' : 'Prova entregue!'}</Text>
          <Text style={[styles.resultSub, { color: muted }]}>
            Você respondeu {result.answered} de {result.total} {result.total === 1 ? 'questão' : 'questões'}.
          </Text>

          <View style={styles.resultStats}>
            <ResultStat value={String(result.correct)} label={result.correct === 1 ? 'Acerto' : 'Acertos'} color={isDark ? '#4ade80' : colors.green[600]} border={isDark ? '#14532d' : '#bbf7d0'} />
            <ResultStat value={`+${result.xp_gained}`} label="XP" color={isDark ? colors.purple[400] : colors.purple[600]} border={isDark ? colors.purple[900] : '#e9d5ff'} />
            <ResultStat value={String(result.best_correct)} label="Seu melhor" color={strong} border={border} />
          </View>

          <GameButton variant="green" size="lg" fullWidth onPress={onExit} style={{ marginTop: 24 }}>
            Voltar ao mapa
          </GameButton>

          {result.review.length > 0 ? (
            <>
              <Text style={[styles.reviewTitle, { color: strong }]}>Gabarito comentado</Text>
              {result.review.map((item, i) => (
                <View key={item.uuid} style={[styles.reviewCard, { borderColor: border }]}>
                  <View style={styles.reviewHead}>
                    <View style={[styles.reviewDot, { backgroundColor: item.is_correct ? colors.green[500] : colors.red[500] }]}>
                      {item.is_correct ? <Check size={14} color="#fff" strokeWidth={3} /> : <X size={14} color="#fff" strokeWidth={3} />}
                    </View>
                    <Text style={[styles.reviewLabel, { color: item.is_correct ? (isDark ? '#4ade80' : colors.green[600]) : colors.red[500] }]}>
                      Questão {i + 1} · Estilo {boardLabel(item.board)}
                    </Text>
                  </View>
                  <Text style={[styles.reviewText, { color: strong }]}>{item.statement}</Text>
                  {!item.is_correct ? (
                    <Text style={[styles.reviewMeta, { color: muted }]}>
                      <Text style={styles.bold}>Sua resposta:</Text> {answerLabel(item, item.answer)}
                    </Text>
                  ) : null}
                  <Text style={[styles.reviewMeta, { color: muted }]}>
                    <Text style={styles.bold}>Gabarito:</Text> {answerLabel(item, item.correct_answer)}
                  </Text>
                  <Text style={[styles.reviewText, { color: isDark ? colors.gray[200] : colors.gray[800] }]}>{item.explanation}</Text>
                  <Text style={[styles.reviewMeta, { color: muted }]}>
                    <Text style={styles.bold}>Fundamento:</Text> {item.legal_basis}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
        <LevelUpOverlay levelUp={levelUp} onDone={() => setLevelUp(null)} isDark={isDark} />
        <ConfettiView />
      </SafeAreaView>
    );
  }

  if (!question) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={colors.purple[500]} size="large" />
      </SafeAreaView>
    );
  }

  /* ===== Prova ===== */
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <TrailTopBar
        progress={(answeredCount / Math.max(1, questions.length)) * 100}
        barColor={colors.purple[500]}
        onExit={() => setConfirmingExit(true)}
      />
      <View style={styles.clockRow}>
        <View style={styles.clock}>
          <Timer size={20} color={secondsLeft <= 30 ? colors.red[500] : strong} strokeWidth={2.5} />
          <Text style={[styles.clockText, { color: secondsLeft <= 30 ? colors.red[500] : strong }]}>{clock(secondsLeft)}</Text>
        </View>
        <View style={[styles.xp, { backgroundColor: isDark ? '#3b0764' : colors.purple[100] }]}>
          <Zap size={16} color={isDark ? colors.purple[300] : colors.purple[700]} fill={isDark ? colors.purple[300] : colors.purple[700]} />
          <Text style={[styles.xpText, { color: isDark ? colors.purple[300] : colors.purple[700] }]}>+{xp} XP</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.content}>
        <View style={styles.questionHead}>
          <Text style={[styles.questionNumber, { color: strong }]}>
            Questão {index + 1} de {questions.length}
          </Text>
          <Text style={[styles.board, { color: isDark ? colors.gray[300] : colors.gray[600], backgroundColor: isDark ? colors.gray[800] : colors.gray[100] }]}>
            Estilo {boardLabel(question.board)}
          </Text>
        </View>
        {question.type === 'true_false' ? <Text style={[styles.instruction, { color: muted }]}>Julgue o item a seguir.</Text> : null}
        <Text style={[styles.statement, { color: isDark ? colors.gray[100] : colors.gray[900] }]}>{question.statement}</Text>
        <View style={{ marginTop: 20 }}>
          <ChoiceList question={question} selected={selected} onSelect={(key) => setSelected(key || null)} feedback={feedback} />
        </View>
      </ScrollView>

      {!feedback ? (
        <View style={[styles.footer, { borderTopColor: isDark ? colors.gray[800] : colors.gray[100], paddingBottom: Math.max(insets.bottom, 8) + 12 }]}>
          {checkError ? <Text style={styles.error}>Não foi possível corrigir agora. Tente de novo.</Text> : null}
          <GameButton variant="purple" size="lg" fullWidth disabled={!selected || checking} onPress={check}>
            Responder
          </GameButton>
        </View>
      ) : (
        // O comentário de cada questão fica para o fim, para não gastar o tempo da prova
        <ResultBar key={question.uuid} correct={feedback.is_correct} onContinue={advance}>
          {!feedback.is_correct ? (
            <ResultText correct={false}>
              Gabarito: <Text style={{ fontWeight: '800', textTransform: 'capitalize' }}>{feedback.correct_answer}</Text>
            </ResultText>
          ) : null}
        </ResultBar>
      )}

      {/* Sair no meio: o tempo continua correndo, então a escolha é entregar ou seguir */}
      <ConfirmSheet
        visible={confirmingExit}
        title="Entregar a prova agora?"
        text="O tempo não para se você sair. Entregando agora, você recebe o XP dos acertos até aqui."
        stayLabel="Continuar a prova"
        leaveLabel="Entregar a prova"
        onStay={() => setConfirmingExit(false)}
        onLeave={finish}
      />
    </SafeAreaView>
  );
}

function Fact({ label, value, border, color }: { label: string; value: string; border?: string; color?: string }) {
  const { isDark } = useAppearance();
  return (
    <View style={[styles.fact, border ? { borderTopWidth: 2, borderTopColor: border } : null]}>
      <Text style={[styles.factLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{label}</Text>
      <Text style={[styles.factValue, { color: color ?? (isDark ? '#fff' : colors.gray[900]) }]}>{value}</Text>
    </View>
  );
}

function ResultStat({ value, label, color, border }: { value: string; label: string; color: string; border: string }) {
  const { isDark } = useAppearance();
  return (
    <View style={[styles.resultStat, { borderColor: border }]}>
      <Text style={[styles.resultStatValue, { color }]}>{value}</Text>
      <Text style={[styles.resultStatLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  message: { fontSize: 15, textAlign: 'center' },
  bold: { fontWeight: '800' },

  introContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  introBody: { flex: 1, justifyContent: 'center', paddingVertical: 32 },
  introIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.purple[500], alignItems: 'center', justifyContent: 'center' },
  introTitle: { marginTop: 20, fontSize: 30, fontWeight: '800' },
  introSub: { marginTop: 4, fontSize: 16 },
  facts: { marginTop: 24, borderWidth: 2, borderRadius: 16 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  factLabel: { fontSize: 14 },
  factValue: { fontSize: 15, fontWeight: '800' },
  introText: { marginTop: 20, fontSize: 14, lineHeight: 21 },

  clockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clockText: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  xp: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  xpText: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },

  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  questionHead: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionNumber: { fontSize: 14, fontWeight: '800' },
  board: { fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  instruction: { marginTop: 16, fontSize: 14 },
  statement: { marginTop: 12, fontSize: 16, lineHeight: 25 },
  footer: { borderTopWidth: 2, paddingHorizontal: 16, paddingTop: 16 },
  error: { marginBottom: 12, fontSize: 14, color: colors.red[600], textAlign: 'center' },

  resultContent: { paddingHorizontal: 16, paddingBottom: 32 },
  resultTitle: { marginTop: 40, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  resultSub: { marginTop: 8, fontSize: 16, textAlign: 'center' },
  resultStats: { marginTop: 24, flexDirection: 'row', gap: 12 },
  resultStat: { flex: 1, alignItems: 'center', borderWidth: 2, borderRadius: 16, paddingVertical: 16 },
  resultStatValue: { fontSize: 24, fontWeight: '800' },
  resultStatLabel: { marginTop: 4, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewTitle: { marginTop: 40, fontSize: 18, fontWeight: '800' },
  reviewCard: { marginTop: 16, borderWidth: 2, borderRadius: 16, padding: 16 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reviewLabel: { fontSize: 14, fontWeight: '800' },
  reviewText: { marginTop: 12, fontSize: 14, lineHeight: 21 },
  reviewMeta: { marginTop: 6, fontSize: 14, lineHeight: 20 },
});

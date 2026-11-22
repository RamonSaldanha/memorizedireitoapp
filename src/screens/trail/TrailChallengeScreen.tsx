import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DisciplineLevelUp } from '../../api/play';
import {
  apiErrorCode,
  boardLabel,
  trailApi,
  type CheckpointAnswerResponse,
  type CheckpointMaterial,
  type CheckpointQuestion,
  type CheckpointResponse,
  type CheckpointStepResponse,
  type EnergyState,
} from '../../api/trail';
import { GuidedSummary, ReadingPanel, useGuidedReading } from '../../components/trail/GuidedSummary';
import { ChoiceList, ResultBar, ResultText, TrailTopBar } from '../../components/trail/TrailUi';
import { ComboBurst, ComboLine } from '../../components/trail/ComboBurst';
import { PhaseEnd } from '../../components/trail/PhaseEnd';
import { GameButton } from '../../components/ui/GameButton';
import { EnergyPill } from '../../components/ui/EnergyPill';
import { useConfetti } from '../../hooks/useConfetti';
import { useGameSounds } from '../../hooks/useGameSounds';
import { useAppearance } from '../../hooks/useAppearance';
import { useUserStore } from '../../stores/userStore';
import { colors } from '../../theme/colors';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Props = NativeStackScreenProps<PlayStackParamList, 'TrailChallenge'>;

type Step =
  | { kind: 'summary'; material: CheckpointMaterial }
  | { kind: 'question'; material: CheckpointMaterial; question: CheckpointQuestion };

/** Busca o desafio e só mostra a tela com os dados na mão. */
export function TrailChallengeScreen({ route, navigation }: Props) {
  const { theme } = useAppearance();
  const { data, error } = useQuery({
    queryKey: ['trail-challenge', route.params.key],
    queryFn: async () => (await trailApi.challenge(route.params.key)).data,
    gcTime: 0,
    retry: false,
  });

  // Desafio por fazer e sem energia: vai para a tela sem energia
  useEffect(() => {
    if (apiErrorCode(error) === 'no_energy') navigation.replace('NoEnergy');
  }, [error]);

  if (!data) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        {error ? (
          <>
            <Text style={[styles.message, { color: theme.foreground }]}>Não foi possível abrir o desafio.</Text>
            <GameButton variant="purple" onPress={() => navigation.goBack()}>
              Voltar ao mapa
            </GameButton>
          </>
        ) : (
          <ActivityIndicator color={colors.family.brandEdge} size="large" />
        )}
      </SafeAreaView>
    );
  }

  return <Challenge data={data} onExit={() => navigation.goBack()} onOutOfEnergy={() => navigation.replace('NoEnergy')} />;
}

/**
 * Desafio do quadrado, como o da web (BetaPlay/Checkpoint.vue): o resumo do material, lido
 * com a leitura guiada, e logo depois as questões dele. Cada passo é gravado na hora; sair a
 * qualquer momento não perde nada e a volta é no primeiro passo que falta. Se tudo já foi
 * feito, é uma revisão: só corrige. Cada questão nova gasta energia (3 certas seguidas dão
 * combo); se ela acaba, a pessoa sai e volta de onde parou quando tiver energia.
 */
function Challenge({ data, onExit, onOutOfEnergy }: { data: CheckpointResponse; onExit: () => void; onOutOfEnergy: () => void }) {
  const { checkpoint, materials } = data;
  const { isDark, theme } = useAppearance();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const updateFromApi = useUserStore((s) => s.updateFromApi);
  const energy = useUserStore((s) => s.energy);
  const setEnergy = useUserStore((s) => s.setEnergy);
  const [outOfEnergy, setOutOfEnergy] = useState(false);
  // A energia com o combo espera o raiozinho chegar na bateria (ComboBurst)
  const comboEnergy = useRef<EnergyState | null>(null);
  useEffect(() => {
    if (data.energy) setEnergy(data.energy);
  }, []);
  // Quem assina pula o convite Premium do fim de fase
  const hasInfiniteLives = useUserStore((s) => s.hasInfiniteLives);
  const { ConfettiView, fire: fireConfetti } = useConfetti();
  const { playPhaseComplete } = useGameSounds();

  const isReview = materials.every((material) => material.done);
  const queue = isReview ? materials : materials.filter((material) => !material.done);

  // O que já foi feito de cada material da fila, contando o que veio guardado do servidor
  const [progress, setProgress] = useState<Record<string, { summary: boolean; answered: number[] }>>(() =>
    Object.fromEntries(
      queue.map((material) => [material.uuid, { summary: !isReview && material.summary_read, answered: isReview ? [] : [...material.answered] }]),
    ),
  );

  // Só os passos que faltam
  const steps = useMemo<Step[]>(
    () =>
      queue.flatMap((material) => {
        const saved = progress[material.uuid];
        return [
          ...(saved.summary ? [] : [{ kind: 'summary' as const, material }]),
          ...material.questions
            .filter((question) => !saved.answered.includes(question.position))
            .map((question) => ({ kind: 'question' as const, material, question })),
        ];
      }),
    // A lista de passos é fixa desde a abertura da tela
    [],
  );

  const [stage, setStage] = useState<'playing' | 'done'>(steps.length === 0 ? 'done' : 'playing');
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  const [selected, setSelected] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [feedback, setFeedback] = useState<CheckpointAnswerResponse | null>(null);
  // O "+5 XP" do combo de quem assina na barra de resultado: as faíscas descem até ele e o acendem
  const comboXpRef = useRef<View>(null);
  const [comboLit, setComboLit] = useState(false);
  // O que o combo de quem assina rendeu no desafio (já dentro do xpGained), para o fim mostrar
  const [comboXp, setComboXp] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  // A estrela ganha no desafio aparece na tela da conquista, no fim (PhaseEnd)
  const [levelUp, setLevelUp] = useState<DisciplineLevelUp | null>(null);

  const [summaryRead, setSummaryRead] = useState(false);
  const [summaryConfirmed, setSummaryConfirmed] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const summaryY = useRef(0);
  const scrollY = useRef(0);
  const viewport = useRef(0);

  const reading = useGuidedReading(step?.kind === 'summary' ? step.material.summary_blocks : EMPTY, {
    onFinished: () => setSummaryRead(true),
    // Mantém o trecho lido na parte de cima da tela
    onFocus: (y, height) => {
      const top = summaryY.current + y;
      if (top < scrollY.current + 40 || top + height > scrollY.current + viewport.current - 200) {
        scrollRef.current?.scrollTo({ y: Math.max(0, top - 80), animated: true });
      }
    },
  });

  // A barra é do material em que a pessoa está: o resumo e as questões dele
  const progressPercent = step
    ? (((progress[step.material.uuid].summary ? 1 : 0) + progress[step.material.uuid].answered.length) / (1 + step.material.questions.length)) * 100
    : 100;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 100;

  const applyStep = (response: CheckpointStepResponse) => {
    setXpGained((xp) => xp + response.xp_gained);
    updateFromApi({ xp: response.user.xp });
    if (response.discipline_level_up) setLevelUp(response.discipline_level_up);
  };

  const markProgress = (material: CheckpointMaterial, change: (made: { summary: boolean; answered: number[] }) => void) =>
    setProgress((prev) => {
      const made = { ...prev[material.uuid], answered: [...prev[material.uuid].answered] };
      change(made);
      return { ...prev, [material.uuid]: made };
    });

  const confirmSummary = () => {
    if (!step) return;
    const material = step.material;
    setSummaryConfirmed(true);
    markProgress(material, (made) => {
      made.summary = true;
    });
    if (isReview) return;

    // Se não gravar, a pessoa só relê o resumo caso saia antes de terminar o material
    trailApi
      .summary(checkpoint.key, material.uuid)
      .then(({ data: response }) => applyStep(response))
      .catch(() => {});
  };

  const check = async () => {
    if (!step || step.kind !== 'question' || !selected || checking) return;
    setChecking(true);
    setCheckError(false);
    try {
      const { data: response } = await trailApi.answer(checkpoint.key, step.material.uuid, step.question.position, selected);
      markProgress(step.material, (made) => {
        made.answered.push(step.question.position);
      });
      setAnsweredCount((n) => n + 1);
      if (response.is_correct) setCorrectCount((n) => n + 1);
      applyStep(response);
      // O combo de quem assina rende XP na hora
      if (response.combo?.xp) {
        const gained = response.combo.xp;
        setXpGained((xp) => xp + gained);
        setComboXp((xp) => xp + gained);
      }
      setComboLit(false);
      setFeedback(response);
      if (response.energy && response.combo && response.combo.gained > 0) {
        comboEnergy.current = response.energy;
        setEnergy({ ...response.energy, value: response.energy.value - response.combo.gained });
      } else if (response.energy) {
        setEnergy(response.energy);
      }
      setOutOfEnergy(Boolean(response.out_of_energy));
      // O comentário aparece embaixo das alternativas
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      setCheckError(true);
    } finally {
      setChecking(false);
    }
  };

  const advance = () => {
    if (outOfEnergy) {
      onOutOfEnergy();
      return;
    }
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      setSummaryRead(false);
      setSummaryConfirmed(false);
      setSelected(null);
      setFeedback(null);
      setCheckError(false);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    // Tudo já foi gravado passo a passo; aqui é só a comemoração
    setStage('done');
    fireConfetti();
    playPhaseComplete();
  };

  // Ao sair, o mapa e as conquistas mostram o que mudou
  useEffect(
    () => () => {
      queryClient.invalidateQueries({ queryKey: ['trail-map'] });
      queryClient.invalidateQueries({ queryKey: ['disciplines'] });
    },
    [],
  );

  if (stage === 'done' || !step) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <PhaseEnd
          title={isReview ? 'Revisão' : 'Desafio'}
          mark={isReview ? 'concluída!' : 'concluído!'}
          count={answeredCount}
          countLabel={answeredCount === 1 ? 'Questão' : 'Questões'}
          xp={xpGained}
          comboXp={comboXp}
          accuracy={accuracy}
          premium={hasInfiniteLives}
          levelUp={levelUp}
          onDone={onExit}
        />
        <ConfettiView />
      </SafeAreaView>
    );
  }

  const materialNumber = materials.indexOf(step.material) + 1;
  const questionNumber = step.kind === 'question' ? step.material.questions.indexOf(step.question) + 1 : 0;
  const muted = isDark ? colors.gray[400] : colors.gray[500];
  const strong = isDark ? '#fff' : colors.gray[900];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <TrailTopBar
        progress={progressPercent}
        onExit={onExit}
        right={<EnergyPill energy={energy} />}
        caption={`${step.material.legislation_title} · Passo ${checkpoint.step_number} de ${checkpoint.step_number} · Desafio${
          materials.length > 1 ? ` · Material ${materialNumber} de ${materials.length}` : ''
        }`}
      />

      <View style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.content, step.kind === 'summary' && { paddingRight: 72 }]}
          onLayout={(e) => {
            viewport.current = e.nativeEvent.layout.height;
          }}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={64}
        >
          <Text style={[styles.materialTitle, { color: strong }]}>{step.material.title}</Text>

          {step.kind === 'summary' ? (
            <View
              style={styles.summary}
              onLayout={(e) => {
                // O resumo é o primeiro item daqui: a posição dele na rolagem
                summaryY.current = e.nativeEvent.layout.y;
              }}
            >
              <GuidedSummary reading={reading} />
              {/* O botão fica no fim do texto e só libera quando a leitura guiada percorreu o resumo */}
              <GameButton variant="purple" size="lg" fullWidth disabled={!summaryRead || summaryConfirmed} onPress={confirmSummary} style={{ marginTop: 32 }}>
                Concluir
              </GameButton>
              {!summaryRead ? (
                <Text style={[styles.hint, { color: muted }]}>
                  {reading.coverage > 0
                    ? `Leitura em ${Math.round(reading.coverage * 100)}%. Rolar ou pular trechos não conta: a leitura guiada precisa passar pelo texto.`
                    : 'Toque em iniciar e acompanhe a leitura guiada até o fim para concluir.'}
                </Text>
              ) : null}
            </View>
          ) : (
            <View>
              <View style={styles.questionHead}>
                <Text style={[styles.questionNumber, { color: strong }]}>
                  Questão {questionNumber} de {step.material.questions.length}
                </Text>
                <Text style={[styles.board, { color: isDark ? colors.gray[300] : colors.gray[600], backgroundColor: isDark ? colors.gray[800] : colors.gray[100] }]}>
                  Estilo {boardLabel(step.question.board)}
                </Text>
              </View>
              {step.question.type === 'true_false' ? <Text style={[styles.instruction, { color: muted }]}>Julgue o item a seguir.</Text> : null}
              <Text style={[styles.statement, { color: isDark ? colors.gray[100] : colors.gray[900] }]}>{step.question.statement}</Text>

              <View style={{ marginTop: 20 }}>
                <ChoiceList
                  question={step.question}
                  selected={selected}
                  onSelect={(key) => setSelected(key || null)}
                  feedback={feedback ? { correct_answer: feedback.correct_answer } : null}
                  strikable
                />
              </View>
              {!feedback ? (
                <Text style={[styles.tip, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>Arraste uma alternativa para a direita para riscá-la.</Text>
              ) : (
                // Comentário do gabarito; o aviso de acerto ou erro fica na barra de baixo
                <View style={[styles.comment, { borderColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
                  <Text style={[styles.commentTitle, { color: strong }]}>Comentário</Text>
                  <Text style={[styles.commentText, { color: isDark ? colors.gray[200] : colors.gray[800] }]}>{feedback.explanation}</Text>
                  <Text style={[styles.basis, { color: isDark ? colors.gray[400] : colors.gray[600] }]}>
                    <Text style={{ fontWeight: '800' }}>Fundamento:</Text> {feedback.legal_basis}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {step.kind === 'summary' && !summaryConfirmed ? <ReadingPanel reading={reading} /> : null}
      </View>

      {step.kind === 'question' && !feedback ? (
        <View style={[styles.footer, { borderTopColor: isDark ? colors.gray[800] : colors.gray[100], paddingBottom: Math.max(insets.bottom, 8) + 12 }]}>
          {checkError ? <Text style={styles.error}>Não foi possível corrigir agora. Tente de novo.</Text> : null}
          <GameButton variant="purple" size="lg" fullWidth disabled={!selected || checking} onPress={check}>
            Responder
          </GameButton>
        </View>
      ) : null}

      {step.kind === 'summary' && summaryConfirmed ? <ResultBar correct title="Resumo concluído!" onContinue={advance} /> : null}

      {step.kind === 'question' && feedback ? (
        <ResultBar correct={feedback.is_correct} buttonLabel={outOfEnergy ? 'Sair' : undefined} onContinue={advance}>
          {feedback.combo ? <ComboLine combo={feedback.combo} correct={feedback.is_correct} targetRef={comboXpRef} lit={comboLit} /> : null}
          {outOfEnergy ? (
            <ResultText correct={feedback.is_correct} bold>
              Sua energia acabou. O que você fez fica guardado.
            </ResultText>
          ) : null}
          {!feedback.is_correct ? (
            <ResultText correct={false}>
              Gabarito: <Text style={{ fontWeight: '800', textTransform: 'capitalize' }}>{feedback.correct_answer}</Text>
            </ResultText>
          ) : null}
          {feedback.material_completed && feedback.xp_gained > 0 ? (
            <ResultText correct={feedback.is_correct} bold>
              Material concluído: +{feedback.xp_gained} XP
            </ResultText>
          ) : null}
        </ResultBar>
      ) : null}

      <ComboBurst
        combo={feedback?.combo ?? null}
        xpTarget={comboXpRef}
        onSpark={() => setComboLit(true)}
        onArrive={() => {
          if (comboEnergy.current) setEnergy(comboEnergy.current);
          comboEnergy.current = null;
        }}
      />
      <ConfettiView />
    </SafeAreaView>
  );
}

const EMPTY: never[] = [];

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  message: { fontSize: 15, textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  materialTitle: { fontSize: 24, lineHeight: 31, fontWeight: '800' },
  summary: { marginTop: 20 },
  hint: { marginTop: 12, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  questionHead: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionNumber: { fontSize: 14, fontWeight: '800' },
  board: { fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  instruction: { marginTop: 16, fontSize: 14 },
  statement: { marginTop: 12, fontSize: 16, lineHeight: 25 },
  tip: { marginTop: 12, fontSize: 12 },
  comment: { marginTop: 24, borderWidth: 2, borderRadius: 16, padding: 16 },
  commentTitle: { fontSize: 15, fontWeight: '800' },
  commentText: { marginTop: 8, fontSize: 14, lineHeight: 21 },
  basis: { marginTop: 12, fontSize: 14, lineHeight: 20 },
  footer: { borderTopWidth: 2, paddingHorizontal: 16, paddingTop: 16 },
  error: { marginBottom: 12, fontSize: 14, color: colors.red[600] },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, BackHandler, Easing, Platform, Pressable, ScrollView, StyleSheet, Text,
  ToastAndroid, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';
import { onboardingApi, type WelcomeOffer } from '../../api/onboarding';
import {
  AREAS, GOALS, MINUTES, challengeFor, suggestTrail, type Area, type Goal, type LegislationOption, type Minutes,
} from '../../lib/onboarding/quiz';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { useAppearance } from '../../hooks/useAppearance';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useConfetti } from '../../hooks/useConfetti';
import { useSuccessSound } from '../../hooks/useSuccessSound';
import { useSubscriptionCheckout } from '../../hooks/useSubscriptionCheckout';
import { ActiveChallenge } from '../../components/game/ActiveChallenge';
import { CompletedSegmentView } from '../../components/game/CompletedSegment';
import { PhaseControls } from '../../components/game/PhaseControls';
import { XpGainPopup } from '../../components/game/XpGainPopup';
import { AvatarStep } from '../../components/onboarding/AvatarStep';
import { GuideBubble } from '../../components/onboarding/GuideBubble';
import { OfferStep } from '../../components/onboarding/OfferStep';
import { OnboardingCta } from '../../components/onboarding/OnboardingCta';
import { QuizOption } from '../../components/onboarding/QuizOption';
import { SkipSheet } from '../../components/onboarding/SkipSheet';
import { TrailStep } from '../../components/onboarding/TrailStep';
import { WelcomeStep } from '../../components/onboarding/WelcomeStep';
import { OVERSHOOT, OVERSHOOT_SOFT } from '../../components/onboarding/motion';
import { obTheme } from '../../components/onboarding/palette';
import { useChallengeBlock } from '../../components/onboarding/useChallengeBlock';
import { colors } from '../../theme/colors';

/**
 * Onboarding de quem acabou de se cadastrar pelo app: porte do
 * `Onboarding/Index.vue` da web, com as mesmas telas, textos e animações.
 * Quiz curto que monta a trilha, um desafio de verdade, a apresentação do
 * avatar e a oferta de boas-vindas.
 *
 * Aparece enquanto `authStore.onboardingPending` estiver ligado; concluir ou
 * pular desliga o flag e o RootNavigator troca para o mapa.
 */

const STEPS = ['welcome', 'goal', 'area', 'minutes', 'trail', 'challenge', 'avatar', 'offer'] as const;
type Step = (typeof STEPS)[number];
type QuizStep = 'goal' | 'area' | 'minutes';

const CHALLENGE_XP = 25;

type QuizOptionData = {
  value: Goal | Area | Minutes;
  title: string;
  caption: string;
  icon: string;
  tint: string;
  bars?: number;
};

const QUIZ: Record<QuizStep, { question: string; options: QuizOptionData[] }> = {
  goal: { question: 'Qual é o seu objetivo com a lei seca?', options: GOALS },
  area: { question: 'Qual área você quer dominar primeiro?', options: AREAS },
  minutes: { question: 'Quanto tempo por dia você topa estudar?', options: MINUTES },
};

const isQuizStep = (s: Step): s is QuizStep => s === 'goal' || s === 'area' || s === 'minutes';

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert('', message);
  }
}

/** O servidor diz que o onboarding já acabou (outro aparelho, ou já pulado). */
const isAlreadyCompleted = (err: any) => err?.response?.status === 409;

export function OnboardingScreen() {
  const { isDark } = useAppearance();
  const theme = obTheme(isDark);
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setOnboardingPending = useAuthStore((s) => s.setOnboardingPending);
  const updateFromApi = useUserStore((s) => s.updateFromApi);
  const { openSubscription } = useSubscriptionCheckout();

  const { data, isError, refetch } = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => (await onboardingApi.get()).data,
  });

  const leave = useCallback(() => {
    setOnboardingPending(false);
  }, []);

  // Concluído em outro lugar: não há o que fazer aqui.
  useEffect(() => {
    if (data?.completed) leave();
  }, [data?.completed]);

  /* ===== Passos ===== */

  const [stepIndex, setStepIndex] = useState(0);
  const stepIndexRef = useRef(0);
  stepIndexRef.current = stepIndex;
  const step: Step = STEPS[stepIndex];
  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  const scrollRef = useRef<ScrollView>(null);

  const goTo = useCallback(
    (index: number) => {
      setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
      scrollRef.current?.scrollTo({ y: 0, animated: !reduce });
    },
    [reduce],
  );
  const next = useCallback(() => goTo(stepIndexRef.current + 1), [goTo]);
  const back = useCallback(() => goTo(stepIndexRef.current - 1), [goTo]);

  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] || 'estudante';

  /* ===== Troca de tela (out-in, ±48px + fade) ===== */

  const [shownIndex, setShownIndex] = useState(0);
  const shownStep: Step = STEPS[shownIndex];
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (stepIndex === shownIndex) return;
    const dir = stepIndex > shownIndex ? 1 : -1;

    if (reduce) {
      setShownIndex(stepIndex);
      return;
    }

    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 220, easing: Easing.ease, useNativeDriver: true }),
      Animated.timing(slide, { toValue: -48 * dir, duration: 280, easing: OVERSHOOT_SOFT, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setShownIndex(stepIndexRef.current);
      slide.setValue(48 * dir);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 280, easing: OVERSHOOT_SOFT, useNativeDriver: true }),
      ]).start();
    });
  }, [stepIndex]);

  /* ===== Barra de progresso ===== */

  const progressAnim = useRef(new Animated.Value(Math.max(progress, 4))).current;
  useEffect(() => {
    const target = Math.max(progress, 4);
    if (reduce) {
      progressAnim.setValue(target);
      return;
    }
    Animated.timing(progressAnim, { toValue: target, duration: 600, easing: OVERSHOOT, useNativeDriver: false }).start();
  }, [progress, reduce]);

  /* ===== Quiz ===== */

  const [goal, setGoal] = useState<Goal | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [minutes, setMinutes] = useState<Minutes | null>(null);
  const advancingRef = useRef(false);

  const answerFor = (s: QuizStep) => (s === 'goal' ? goal : s === 'area' ? area : minutes);

  /** Marca a alternativa, deixa o "pop" aparecer e só então avança. */
  const choose = (forStep: QuizStep, value: QuizOptionData['value']) => {
    // Toque na tela que está saindo, durante a troca: não vale.
    if (advancingRef.current || STEPS[stepIndexRef.current] !== forStep) return;
    if (forStep === 'goal') setGoal(value as Goal);
    else if (forStep === 'area') setArea(value as Area);
    else setMinutes(value as Minutes);
    advancingRef.current = true;
    setTimeout(() => {
      advancingRef.current = false;
      next();
    }, reduce ? 120 : 420);
  };

  /* ===== Trilha ===== */

  const [trail, setTrail] = useState<number[]>([]);
  const trailKeyRef = useRef('');
  const [showAllLaws, setShowAllLaws] = useState(false);
  const [savingTrail, setSavingTrail] = useState(false);

  useEffect(() => {
    if (step !== 'trail' || !goal || !area || !data) return;
    // Refaz a sugestão só quando as respostas mudaram, para não desfazer ajustes.
    const key = `${goal}-${area}`;
    if (key !== trailKeyRef.current) {
      setTrail(suggestTrail(goal, area, data.legislations));
      trailKeyRef.current = key;
      setShowAllLaws(false);
    }
  }, [step, goal, area, data]);

  const legislations = data?.legislations ?? [];
  const trailLaws = useMemo(
    () => trail.map((id) => legislations.find((l) => l.id === id)).filter((l): l is LegislationOption => !!l),
    [trail, legislations],
  );
  const otherLaws = useMemo(() => legislations.filter((l) => !trail.includes(l.id)), [trail, legislations]);

  const toggleLaw = (id: number) => {
    setTrail((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  };

  const saveTrail = async () => {
    if (!trail.length || savingTrail || !goal || !area || !minutes) return;
    setSavingTrail(true);
    try {
      await onboardingApi.saveTrail({ goal, area, minutes, legislation_ids: trail });
      // A trilha é a seleção de legislações do mapa.
      queryClient.invalidateQueries({ queryKey: ['play-map'] });
      next();
    } catch (err) {
      if (isAlreadyCompleted(err)) return leave();
      showToast('Não foi possível salvar a trilha. Tente novamente.');
    } finally {
      setSavingTrail(false);
    }
  };

  /* ===== Desafio ===== */

  const challenge = useMemo(() => challengeFor(goal ?? 'faculdade', area ?? 'indica'), [goal, area]);
  const [challengeSolved, setChallengeSolved] = useState(false);
  const challengePostedRef = useRef(false);

  useEffect(() => {
    if (data?.challenge_done) setChallengeSolved(true);
  }, [data?.challenge_done]);

  const { ConfettiView, fire: fireConfetti } = useConfetti();
  const { play: playWinSound } = useSuccessSound();
  const [xpAmount, setXpAmount] = useState<number | null>(null);
  const [xpKey, setXpKey] = useState(0);

  const onSolved = useCallback(() => {
    // A mesma comemoração da tela de fase.
    fireConfetti();
    playWinSound();
    setXpAmount(CHALLENGE_XP);
    setXpKey((k) => k + 1);
    setChallengeSolved(true);

    if (data?.challenge_done || challengePostedRef.current) return;
    challengePostedRef.current = true;
    onboardingApi
      .completeChallenge()
      .then((res) => {
        setUser(res.data.user);
        updateFromApi(res.data.user);
      })
      .catch((err) => {
        challengePostedRef.current = false;
        if (isAlreadyCompleted(err)) leave();
      });
  }, [data?.challenge_done]);

  const block = useChallengeBlock(challenge, onSolved);
  const showCompletedBlock = challengeSolved && !block.solvedNow;

  /* ===== Oferta ===== */

  const [welcomeOffer, setWelcomeOffer] = useState<WelcomeOffer | null>(null);
  const offerStartedRef = useRef(false);

  useEffect(() => {
    if (data?.welcome_offer) setWelcomeOffer(data.welcome_offer);
  }, [data?.welcome_offer?.expires_at]);

  // Liga o relógio das 24h na primeira vez que a oferta aparece.
  useEffect(() => {
    if (step !== 'offer' || !data || data.welcome_offer || welcomeOffer || offerStartedRef.current) return;
    offerStartedRef.current = true;
    onboardingApi
      .startOffer()
      .then((res) => setWelcomeOffer(res.data.welcome_offer))
      .catch((err) => {
        offerStartedRef.current = false;
        if (isAlreadyCompleted(err)) leave();
      });
  }, [step, data]);

  const offerPercent = welcomeOffer?.percent_off ?? 15;

  /* ===== Fim ===== */

  const [finishing, setFinishing] = useState<'map' | 'subscription' | null>(null);

  const finish = async (nextPage: 'map' | 'subscription') => {
    if (finishing) return;
    setFinishing(nextPage);
    try {
      const res = await onboardingApi.finish();
      setUser(res.data.user);
      updateFromApi(res.data.user);
      queryClient.invalidateQueries({ queryKey: ['play-map'] });
      queryClient.removeQueries({ queryKey: ['onboarding'] });
      // Aceitou a oferta: a página de assinatura do site já abre no anual com o desconto.
      if (nextPage === 'subscription' && res.data.user.welcome_offer) {
        await openSubscription();
      }
      await setOnboardingPending(false);
    } catch {
      setFinishing(null);
      showToast('Não foi possível continuar. Tente novamente.');
    }
  };

  /* ===== Pular ===== */

  const [showSkip, setShowSkip] = useState(false);

  // Voltar do Android: volta um passo; no primeiro, pergunta se quer pular.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stepIndexRef.current > 0) back();
      else setShowSkip(true);
      return true;
    });
    return () => sub.remove();
  }, [back]);

  /* ===== Render ===== */

  const renderStep = () => {
    if (shownStep === 'welcome') {
      return <WelcomeStep firstName={firstName} isDark={isDark} theme={theme} reduce={reduce} />;
    }

    if (isQuizStep(shownStep)) {
      const quiz = QUIZ[shownStep];
      const answer = answerFor(shownStep);
      return (
        <View style={styles.section}>
          <GuideBubble title={quiz.question} theme={theme} reduce={reduce} />
          <View style={styles.options} accessibilityRole="radiogroup">
            {quiz.options.map((opt, i) => (
              <QuizOption
                key={String(opt.value)}
                title={opt.title}
                caption={opt.caption}
                icon={opt.icon}
                tintName={opt.tint}
                bars={opt.bars}
                selected={answer === opt.value}
                index={i}
                onPress={() => choose(shownStep, opt.value)}
                isDark={isDark}
                theme={theme}
                reduce={reduce}
              />
            ))}
          </View>
        </View>
      );
    }

    if (shownStep === 'trail') {
      if (!data) {
        return (
          <View style={styles.loading}>
            {isError ? (
              <>
                <Text style={[styles.loadingText, { color: theme.muted }]}>Não foi possível carregar as leis.</Text>
                <Pressable onPress={() => refetch()} hitSlop={8}>
                  <Text style={[styles.linkText, { color: theme.muted }]}>Tentar de novo</Text>
                </Pressable>
              </>
            ) : (
              <ActivityIndicator color={colors.green[500]} />
            )}
          </View>
        );
      }
      return (
        <TrailStep
          trailLaws={trailLaws}
          otherLaws={otherLaws}
          showAllLaws={showAllLaws}
          onShowAllLaws={() => setShowAllLaws(true)}
          onToggleLaw={toggleLaw}
          isDark={isDark}
          theme={theme}
          reduce={reduce}
        />
      );
    }

    if (shownStep === 'challenge') {
      return (
        <View style={styles.section}>
          <GuideBubble
            title="Desafio relâmpago!"
            subtitle="Toque nas palavras para completar o artigo."
            theme={theme}
            reduce={reduce}
          />
          {/* Nome da lei, como os separadores do mapa */}
          <View style={styles.lawRow}>
            <View style={[styles.lawLine, { backgroundColor: isDark ? colors.gray[700] : colors.gray[200] }]} />
            <Text style={[styles.lawName, { color: theme.muted }]}>{challenge.law}</Text>
            <View style={[styles.lawLine, { backgroundColor: isDark ? colors.gray[700] : colors.gray[200] }]} />
          </View>
          {showCompletedBlock ? (
            <View style={styles.completedBlock}>
              <CompletedSegmentView segment={block.completedSegment} />
            </View>
          ) : (
            <View style={styles.activeBlock}>
              <ActiveChallenge
                segment={block.segment}
                userSelections={block.userSelections}
                verified={block.verified}
                verificationResults={block.verificationResults}
                onUnselect={block.unselect}
              />
            </View>
          )}
        </View>
      );
    }

    if (shownStep === 'avatar') {
      return <AvatarStep isDark={isDark} theme={theme} reduce={reduce} />;
    }

    return (
      <OfferStep
        percent={offerPercent}
        yearlyPlan={data?.yearly_plan ?? null}
        welcomeOffer={welcomeOffer}
        isDark={isDark}
        theme={theme}
        reduce={reduce}
      />
    );
  };

  const ctaLabel = step === 'welcome' ? 'Bora começar' : step === 'trail' ? 'Salvar minha trilha' : 'Continuar';
  const hasFooter = !isQuizStep(step);
  // Palavras + Limpar/Verificar do desafio, no mesmo lugar da tela de fase.
  const showPlayControls = step === 'challenge' && shownStep === 'challenge' && !challengeSolved;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.page }]} edges={['top', 'left', 'right']}>
      {/* Topo: voltar, progresso, pular */}
      <View style={[styles.header, { backgroundColor: theme.page }]}>
        <Pressable
          onPress={back}
          disabled={stepIndex === 0}
          accessibilityLabel="Voltar"
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { backgroundColor: theme.pressBg },
            stepIndex === 0 && styles.invisible,
          ]}
        >
          <ArrowLeft size={20} color={colors.gray[400]} />
        </Pressable>
        <View
          style={[styles.track, { backgroundColor: theme.track }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }}
        >
          <Animated.View
            style={[
              styles.fill,
              { width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
            ]}
          >
            <View style={styles.fillShine} />
          </Animated.View>
        </View>
        {step !== 'offer' ? (
          <Pressable
            onPress={() => setShowSkip(true)}
            style={({ pressed }) => [styles.skipBtn, pressed && { backgroundColor: theme.pressBg }]}
          >
            <Text style={styles.skipText}>Pular</Text>
          </Pressable>
        ) : (
          <View style={styles.skipSpacer} />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, !hasFooter && { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View key={shownStep} style={[styles.stage, { opacity: fade, transform: [{ translateX: slide }] }]}>
          {renderStep()}
        </Animated.View>
      </ScrollView>

      {/* Rodapé com a ação da tela */}
      {showPlayControls ? (
        <PhaseControls
          options={block.availableOptions}
          hasLacunas={block.segment.lacunas.length > 0}
          allFilled={block.allFilled}
          verified={block.verified}
          isSubmitting={false}
          onSelect={block.select}
          onClear={block.clear}
          onVerify={block.verify}
          style={{ backgroundColor: theme.page, borderTopWidth: 0 }}
        />
      ) : hasFooter && (step !== 'challenge' || challengeSolved) ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.page, paddingBottom: 16 + insets.bottom },
            step !== 'challenge' && { borderTopWidth: 2, borderTopColor: theme.hairline },
          ]}
        >
          {step === 'offer' ? (
            <>
              <OnboardingCta
                pulse
                loading={finishing === 'subscription'}
                disabled={!!finishing}
                onPress={() => finish('subscription')}
                isDark={isDark}
                reduce={reduce}
              >
                {`Garantir ${offerPercent}% off`}
              </OnboardingCta>
              <Pressable
                onPress={() => finish('map')}
                disabled={!!finishing}
                style={[styles.textBtn, !!finishing && { opacity: 0.6 }]}
              >
                {({ pressed }) => (
                  <View style={styles.textBtnRow}>
                    {finishing === 'map' && <ActivityIndicator size="small" color={theme.muted} />}
                    <Text
                      style={[
                        styles.textBtnLabel,
                        { color: pressed ? (isDark ? colors.gray[200] : colors.gray[700]) : theme.muted },
                      ]}
                    >
                      Continuar no plano grátis
                    </Text>
                  </View>
                )}
              </Pressable>
            </>
          ) : (
            <OnboardingCta
              loading={step === 'trail' && savingTrail}
              disabled={step === 'trail' && (!data || !trail.length || savingTrail)}
              onPress={step === 'trail' ? saveTrail : next}
              isDark={isDark}
              reduce={reduce}
            >
              {ctaLabel}
            </OnboardingCta>
          )}
        </View>
      ) : null}

      <XpGainPopup key={xpKey} amount={xpAmount} onDone={() => setXpAmount(null)} />
      <ConfettiView />

      {/* Aviso ao pular */}
      <SkipSheet
        visible={showSkip}
        skipping={!!finishing}
        onClose={() => setShowSkip(false)}
        onSkip={() => finish('map')}
        isDark={isDark}
        theme={theme}
        reduce={reduce}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invisible: { opacity: 0 },
  track: {
    flex: 1,
    height: 14,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.green[500],
  },
  // O filete de brilho da barra (`bg-white/35`).
  fillShine: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  skipBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.gray[400],
  },
  skipSpacer: { width: 40 },

  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 576,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  stage: { flex: 1 },

  section: { paddingVertical: 16 },
  options: { gap: 12 },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  loadingText: { fontSize: 14, lineHeight: 20 },
  linkText: { fontSize: 14, lineHeight: 20, fontWeight: '700', textDecorationLine: 'underline' },

  lawRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lawLine: { flex: 1, height: 1 },
  lawName: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  activeBlock: { paddingTop: 16 },
  completedBlock: { paddingVertical: 24 },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  textBtn: {
    borderRadius: 12,
    paddingVertical: 8,
  },
  textBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  textBtnLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';

import { GameButton } from '../ui/GameButton';
import { ChoiceCard, ChoiceKey, type ChoiceState } from '../ui/ChoiceCard';
import { colors } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';
import { useGameSounds } from '../../hooks/useGameSounds';
import type { StudyQuestion } from '../../api/trail';

// Peças comuns às telas do mapa novo (fase, desafio do quadrado e Dia da prova), iguais às
// da web: o topo com sair e a barra de progresso, a barra de resultado, a tela de fim e as
// alternativas das questões.

/* ===== Topo ===== */

export function TrailTopBar({
  progress,
  onExit,
  caption,
  barColor = colors.green[500],
  right,
}: {
  progress: number;
  onExit: () => void;
  caption?: string;
  barColor?: string;
  right?: React.ReactNode;
}) {
  const { isDark } = useAppearance();
  const width = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(width, { toValue: progress, duration: 500, useNativeDriver: false }).start();
  }, [progress]);

  return (
    <View style={styles.topBar}>
      <View style={styles.topRow}>
        <GameButton variant="ghost" size="sm" square onPress={onExit} hitSlop={8} accessibilityLabel="Sair" containerStyle={styles.exit}>
          <X size={24} color={isDark ? colors.gray[400] : colors.gray[500]} />
        </GameButton>
        <View style={[styles.track, { backgroundColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor: barColor, width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) },
            ]}
          />
        </View>
        {right}
      </View>
      {caption ? (
        <Text numberOfLines={1} style={[styles.caption, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

/* ===== Barra de resultado ===== */

/**
 * Sobe no pé da tela depois da resposta, na cor do acerto ou do erro, com o aviso, os
 * detalhes e o botão de seguir. Todo acerto tem som; o erro fica em silêncio.
 */
export function ResultBar({
  correct,
  title,
  buttonLabel = 'Continuar',
  onContinue,
  children,
}: {
  correct: boolean;
  title?: string;
  buttonLabel?: string;
  onContinue: () => void;
  children?: React.ReactNode;
}) {
  const { isDark } = useAppearance();
  const insets = useSafeAreaInsets();
  const { playCorrect } = useGameSounds();
  const slide = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    if (correct) playCorrect();
  }, []);

  const tone = correct
    ? { bg: isDark ? '#052e16' : colors.green[100], border: isDark ? '#14532d' : '#bbf7d0', title: isDark ? '#86efac' : colors.green[700], body: isDark ? '#bbf7d0' : '#166534', dot: colors.green[500] }
    : { bg: isDark ? '#450a0a' : colors.red[100], border: isDark ? '#7f1d1d' : '#fecaca', title: isDark ? '#fca5a5' : colors.red[700], body: isDark ? '#fecaca' : '#991b1b', dot: colors.red[500] };

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[
        styles.resultBar,
        { backgroundColor: tone.bg, borderTopColor: tone.border, paddingBottom: Math.max(insets.bottom, 8) + 12, transform: [{ translateY: slide }] },
      ]}
    >
      <View style={styles.resultHead}>
        <View style={[styles.resultDot, { backgroundColor: tone.dot }]}>
          {correct ? <Check size={16} color="#fff" strokeWidth={3.5} /> : <X size={16} color="#fff" strokeWidth={3.5} />}
        </View>
        <Text style={[styles.resultTitle, { color: tone.title }]}>{title ?? (correct ? 'Você acertou!' : 'Não foi dessa vez')}</Text>
      </View>
      {children ? <View style={styles.resultBody}>{wrapText(children, tone.body)}</View> : null}
      <GameButton variant={correct ? 'success' : 'danger'} size="lg" fullWidth onPress={onContinue} style={{ marginTop: 16 }}>
        {buttonLabel}
      </GameButton>
    </Animated.View>
  );
}

function wrapText(children: React.ReactNode, color: string) {
  return React.Children.map(children, (child) =>
    typeof child === 'string' ? <Text style={[styles.resultText, { color }]}>{child}</Text> : child,
  );
}

/** Texto do corpo da barra de resultado, na cor dela. */
export function ResultText({ correct, children, bold = false }: { correct: boolean; children: React.ReactNode; bold?: boolean }) {
  const { isDark } = useAppearance();
  const color = correct ? (isDark ? '#bbf7d0' : '#166534') : isDark ? '#fecaca' : '#991b1b';
  return <Text style={[styles.resultText, { color }, bold && { fontWeight: '700' }]}>{children}</Text>;
}

/* ===== Fim da fase ===== */

/* ===== Alternativas ===== */

export function choicesOf(question: StudyQuestion): { key: string; text: string }[] {
  return question.type === 'true_false'
    ? [
        { key: 'certo', text: 'Certo' },
        { key: 'errado', text: 'Errado' },
      ]
    : Object.entries(question.options ?? {}).map(([key, text]) => ({ key, text }));
}

// Distância que arma o risco (a alternativa já aparece riscada antes de soltar)
const STRIKE_DISTANCE = 40;
// Até onde o cartão acompanha o dedo; depois disso, resiste
const FOLLOW_MAX = 72;

/**
 * As alternativas da questão. Tocar marca; arrastar para o lado (qualquer um) ou segurar risca
 * (ou desrisca) a alternativa, para eliminar opções como se faz na prova (`strikable`). Igual
 * ao site (composables/useStrikeChoices.ts). Depois da resposta, a certa fica verde e a marcada
 * errada, vermelha.
 */
export function ChoiceList({
  question,
  selected,
  onSelect,
  feedback,
  strikable = false,
}: {
  question: StudyQuestion;
  selected: string | null;
  onSelect: (key: string) => void;
  feedback: { correct_answer: string; answer?: string } | null;
  strikable?: boolean;
}) {
  const [struck, setStruck] = useState<Record<string, boolean>>({});

  useEffect(() => setStruck({}), [question.statement]);

  return (
    <View style={styles.choices}>
      {choicesOf(question).map((choice) => (
        <Choice
          key={choice.key}
          choiceKey={choice.key}
          text={choice.text}
          multiple={question.type === 'multiple_choice'}
          selected={selected === choice.key}
          struck={!!struck[choice.key]}
          disabled={!!feedback}
          state={
            !feedback
              ? 'open'
              : choice.key.toLowerCase() === feedback.correct_answer.toLowerCase()
                ? 'right'
                : choice.key === (feedback.answer ?? selected)
                  ? 'wrong'
                  : 'other'
          }
          onPress={() => {
            onSelect(choice.key);
            setStruck((prev) => ({ ...prev, [choice.key]: false }));
          }}
          onStrike={
            strikable && !feedback
              ? () => {
                  setStruck((prev) => ({ ...prev, [choice.key]: !prev[choice.key] }));
                  if (!struck[choice.key] && selected === choice.key) onSelect('');
                }
              : undefined
          }
        />
      ))}
    </View>
  );
}

function Choice({
  choiceKey,
  text,
  multiple,
  selected,
  struck,
  disabled,
  state,
  onPress,
  onStrike,
}: {
  choiceKey: string;
  text: string;
  multiple: boolean;
  selected: boolean;
  struck: boolean;
  disabled: boolean;
  state: 'open' | 'right' | 'wrong' | 'other';
  onPress: () => void;
  onStrike?: () => void;
}) {
  const { isDark } = useAppearance();
  const dx = useRef(new Animated.Value(0)).current;
  const onStrikeRef = useRef(onStrike);
  onStrikeRef.current = onStrike;
  // Passou do limite: já mostra como a alternativa vai ficar ao soltar
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const arm = (value: boolean) => {
    if (armedRef.current === value) return;
    armedRef.current = value;
    setArmed(value);
  };

  const settle = () => {
    arm(false);
    Animated.spring(dx, { toValue: 0, friction: 7, tension: 140, useNativeDriver: true }).start();
  };

  const pan = useRef(
    PanResponder.create({
      // Só arrasto para o lado: o vertical continua rolando a tela
      onMoveShouldSetPanResponder: (_e, g) => !!onStrikeRef.current && Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onMoveShouldSetPanResponderCapture: (_e, g) => !!onStrikeRef.current && Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      // Começou a riscar: a rolagem não toma o gesto no meio
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove: (_e, g) => {
        const distance = Math.abs(g.dx);
        const shown = distance <= FOLLOW_MAX ? distance : FOLLOW_MAX + (distance - FOLLOW_MAX) * 0.25;
        dx.setValue(Math.sign(g.dx) * shown);
        arm(distance >= STRIKE_DISTANCE);
      },
      onPanResponderRelease: () => {
        if (armedRef.current) onStrikeRef.current?.();
        settle();
      },
      onPanResponderTerminate: settle,
    }),
  ).current;

  const looksStruck = armed ? !struck : struck;

  const cardState: ChoiceState =
    state === 'open' ? (selected ? 'selected' : 'open') : state === 'other' ? 'dim' : state;
  const textColor = isDark ? colors.gray[100] : colors.gray[800];

  return (
    <Animated.View style={{ transform: [{ translateX: dx }] }} {...pan.panHandlers}>
      <ChoiceCard
        state={cardState}
        onPress={onPress}
        onLongPress={onStrike}
        disabled={disabled}
        accessibilityState={{ selected, disabled }}
        style={styles.choice}
      >
        {multiple ? (
          <View style={looksStruck ? styles.struckKey : undefined}>
            <ChoiceKey state={cardState}>{choiceKey}</ChoiceKey>
          </View>
        ) : null}
        <Text style={[styles.choiceText, { color: textColor }, !multiple && { fontWeight: '700' }, looksStruck && styles.struck]}>{text}</Text>
      </ChoiceCard>
    </Animated.View>
  );
}

/* ===== Confirmação ===== */

/** Pergunta de saída por cima da tela, com o botão de seguir em destaque. */
export function ConfirmSheet({
  visible,
  title,
  text,
  stayLabel,
  leaveLabel,
  onStay,
  onLeave,
}: {
  visible: boolean;
  title: string;
  text: string;
  stayLabel: string;
  leaveLabel: string;
  onStay: () => void;
  onLeave: () => void;
}) {
  const { isDark } = useAppearance();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay} statusBarTranslucent>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { backgroundColor: isDark ? colors.gray[800] : '#fff' }]}>
          <Text style={[styles.sheetTitle, { color: isDark ? '#fff' : colors.gray[900] }]}>{title}</Text>
          <Text style={[styles.sheetText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{text}</Text>
          <GameButton variant="purple" size="lg" fullWidth onPress={onStay} style={{ marginTop: 20 }}>
            {stayLabel}
          </GameButton>
          <GameButton variant="white" size="lg" fullWidth onPress={onLeave} isDark={isDark} style={{ marginTop: 12 }}>
            {leaveLabel}
          </GameButton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 12, paddingTop: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exit: { marginLeft: -8 },
  track: { flex: 1, height: 12, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  caption: { marginTop: 8, fontSize: 12, fontWeight: '500' },

  resultBar: { borderTopWidth: 2, paddingHorizontal: 16, paddingTop: 16 },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 18, fontWeight: '800' },
  resultBody: { marginTop: 8, gap: 4 },
  resultText: { fontSize: 14, lineHeight: 20 },

  choices: { gap: 10 },
  choice: { alignItems: 'flex-start' },
  struckKey: { opacity: 0.5 },
  choiceText: { flex: 1, fontSize: 15, lineHeight: 21 },
  struck: { textDecorationLine: 'line-through', opacity: 0.5 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: 16 },
  sheet: { borderRadius: 20, padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetText: { marginTop: 6, fontSize: 14, lineHeight: 20 },
});

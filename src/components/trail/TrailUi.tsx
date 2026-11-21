import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, FileCheck, Target, X, Zap } from 'lucide-react-native';

// A mesma animação da web (public/img/vencedora.gif): a estudante comemorando no notebook
const WINNER = require('../../../assets/img/vencedora.gif');
// 418 × 627 px
const WINNER_RATIO = 418 / 627;
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

/** Tela de fim (fase, revisão ou desafio): o título, os números e um único botão. O XP sobe contando. */
export function PhaseComplete({
  title,
  count,
  countLabel,
  xp,
  accuracy,
  onContinue,
}: {
  title: string;
  count: number;
  countLabel: string;
  xp: number;
  accuracy: number;
  onContinue: () => void;
}) {
  const { isDark } = useAppearance();
  const shownXp = useCountUp(xp, 300);
  const border = isDark ? colors.gray[700] : colors.gray[200];
  const xpColor = isDark ? colors.family.brand : colors.family.brandEdge;

  return (
    <View style={styles.completeWrap}>
      <View style={styles.completeHero}>
        <Image source={WINNER} style={styles.winner} resizeMode="contain" accessibilityIgnoresInvertColors />

        <Text style={[styles.completeTitle, { color: isDark ? '#fff' : colors.gray[900] }]}>{title}</Text>
        <Text style={[styles.completeText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
          Você está um passo mais perto da aprovação.
        </Text>
      </View>

      <View style={[styles.stats, { borderColor: border }]}>
        <Stat icon={<FileCheck size={20} color={isDark ? '#4ade80' : colors.green[600]} />} value={String(count)} label={countLabel} color={isDark ? '#4ade80' : colors.green[600]} />
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <Stat icon={<Zap size={20} color={xpColor} fill={xpColor} />} value={String(shownXp)} label="XP recebido" color={xpColor} />
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <Stat icon={<Target size={20} color={colors.blue[500]} />} value={`${accuracy}%`} label="Precisão" color={colors.blue[500]} />
      </View>

      <GameButton variant="purple" size="lg" fullWidth onPress={onContinue} style={{ marginTop: 24 }}>
        Continuar
      </GameButton>
    </View>
  );
}

function Stat({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  const { isDark } = useAppearance();
  return (
    <View style={styles.stat}>
      <View style={styles.statValueRow}>
        {icon}
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={[styles.statLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{label}</Text>
    </View>
  );
}

function useCountUp(target: number, delay = 0) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      const began = Date.now();
      frame = setInterval(() => {
        const t = Math.min(1, (Date.now() - began) / 900);
        setShown(Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t >= 1 && frame) clearInterval(frame);
      }, 30);
    }, delay);
    return () => {
      clearTimeout(start);
      if (frame) clearInterval(frame);
    };
  }, [target]);
  return shown;
}

/* ===== Alternativas ===== */

export function choicesOf(question: StudyQuestion): { key: string; text: string }[] {
  return question.type === 'true_false'
    ? [
        { key: 'certo', text: 'Certo' },
        { key: 'errado', text: 'Errado' },
      ]
    : Object.entries(question.options ?? {}).map(([key, text]) => ({ key, text }));
}

const STRIKE_DISTANCE = 48;

/**
 * As alternativas da questão. Tocar marca; arrastar para a direita risca (ou desrisca) a
 * alternativa, para eliminar opções como se faz na prova (`strikable`). Depois da resposta, a
 * certa fica verde e a marcada errada, vermelha.
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
            strikable
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

  const pan = useRef(
    PanResponder.create({
      // Só arrasto para o lado: o vertical continua rolando a tela
      onMoveShouldSetPanResponder: (_e, g) => !!onStrikeRef.current && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => dx.setValue(Math.max(0, Math.min(g.dx, STRIKE_DISTANCE + 24))),
      onPanResponderRelease: (_e, g) => {
        if (g.dx >= STRIKE_DISTANCE) onStrikeRef.current?.();
        Animated.timing(dx, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => Animated.timing(dx, { toValue: 0, duration: 200, useNativeDriver: true }).start(),
    }),
  ).current;

  const cardState: ChoiceState =
    state === 'open' ? (selected ? 'selected' : 'open') : state === 'other' ? 'dim' : state;
  const textColor = isDark ? colors.gray[100] : colors.gray[800];

  return (
    <Animated.View style={{ transform: [{ translateX: dx }] }} {...pan.panHandlers}>
      <ChoiceCard
        state={cardState}
        onPress={onPress}
        disabled={disabled}
        accessibilityState={{ selected, disabled }}
        style={styles.choice}
      >
        {multiple ? (
          <View style={struck ? styles.struckKey : undefined}>
            <ChoiceKey state={cardState}>{choiceKey}</ChoiceKey>
          </View>
        ) : null}
        <Text style={[styles.choiceText, { color: textColor }, !multiple && { fontWeight: '700' }, struck && styles.struck]}>{text}</Text>
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

  completeWrap: { flex: 1, paddingHorizontal: 20, paddingBottom: 24 },
  completeHero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  // Altura da web (h-56); a largura segue a proporção da imagem
  winner: { height: 224, width: 224 * WINNER_RATIO },
  completeTitle: { marginTop: 16, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  completeText: { marginTop: 8, fontSize: 16, textAlign: 'center' },
  stats: { flexDirection: 'row', borderWidth: 2, borderRadius: 16 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { marginTop: 2, fontSize: 13 },
  statDivider: { width: 2 },

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

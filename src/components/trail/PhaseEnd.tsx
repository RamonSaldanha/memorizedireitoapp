import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FileCheck, Target, Zap } from 'lucide-react-native';
import { GameButton } from '../ui/GameButton';
import { useAppearance } from '../../hooks/useAppearance';
import { useSubscriptionCheckout } from '../../hooks/useSubscriptionCheckout';
import { colors, familyTokens } from '../../theme/colors';

/**
 * Fim de fase do mapa novo, igual ao web (components/beta-preview/PhaseEnd.vue).
 * - Passagem marca-texto: quatro riscos atravessam a tela na diagonal, um depois do outro, até
 *   cobri-la; por baixo a tela troca, e os riscos saem pelo outro lado. Mesmo tom do traço do
 *   título (brandMark). Vale ao abrir (folha lisa → resultado) e em "Continuar" (resultado →
 *   convite Premium, só para quem não assina). Quem assina, ou pula o convite, sai (onDone).
 * - Com "reduzir movimento", troca direto.
 */

const WINNER = require('../../../assets/img/vencedora.gif');
const NAMED = require('../../../assets/img/premium-nomeado.gif');

// Preço do anual: R$ 107,91 (R$ 8,99/mês, 25% abaixo de 12x o mensal de R$ 11,99). Igual ao web.
const YEARLY = 'R$ 107,91';
const YEARLY_PER_MONTH = 'R$ 8,99';
const DISCOUNT = '-25%';
// Referência de preço de um vade-mecum impresso atualizado (confirmar antes de publicar)
const VADE_MECUM = 'R$ 200+';
const ENDINGS = ['joga sem parar.', 'decora de vez.', 'avança mais rápido.', 'passa na prova.', 'é nomeado.'];

// Azul do Premium: o do mapa (blue-500), com a base no blue-700
const BLUE = '#3b82f6';
const BLUE_EDGE = '#1d4ed8';

const BANDS = 4;
const STAGGER = 90;
const SWEEP = 260;
const EASE = Easing.bezier(0.65, 0, 0.35, 1);
// Moldura das ilustrações: as duas bonecas aparecem do mesmo tamanho
const HERO_MAX = 240;

type Stage = 'blank' | 'complete' | 'invite';

export function PhaseEnd({
  title,
  mark,
  count,
  countLabel,
  xp,
  accuracy,
  premium,
  onDone,
}: {
  title: string;
  mark: string;
  count: number;
  countLabel: string;
  xp: number;
  accuracy: number;
  premium: boolean;
  onDone: () => void;
}) {
  const { isDark } = useAppearance();
  const t = familyTokens(isDark);
  const [stage, setStage] = useState<Stage>('blank');
  const [sweep, setSweep] = useState<'in' | 'out' | null>(null);
  const bands = useRef(Array.from({ length: BANDS }, () => new Animated.Value(0))).current;
  const busy = useRef(false);
  const reduce = useRef(false);

  function highlightTo(to: Stage) {
    if (busy.current) return;
    if (reduce.current) {
      setStage(to);
      return;
    }
    busy.current = true;
    bands.forEach((b) => b.setValue(0));
    setSweep('in');
    const run = (toValue: number) =>
      Animated.stagger(
        STAGGER,
        bands.map((b) => Animated.timing(b, { toValue, duration: SWEEP, easing: EASE, useNativeDriver: true })),
      );
    run(1).start(() => {
      setStage(to);
      setSweep('out');
      run(0).start(() => {
        setSweep(null);
        busy.current = false;
      });
    });
  }

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      reduce.current = r;
      highlightTo('complete');
    });
  }, []);

  const background = isDark ? colors.dark.background : colors.background;

  return (
    <View style={[styles.fill, { backgroundColor: background }]}>
      {stage === 'complete' ? (
        <ResultScene
          title={title}
          mark={mark}
          count={count}
          countLabel={countLabel}
          xp={xp}
          accuracy={accuracy}
          onContinue={() => (premium ? onDone() : highlightTo('invite'))}
        />
      ) : stage === 'invite' ? (
        <PremiumInvite reduceMotion={reduce.current} onSkip={onDone} />
      ) : null}

      {sweep ? (
        <View style={styles.bands} pointerEvents="none">
          {bands.map((b, i) => (
            <Animated.View
              key={i}
              style={[
                styles.band,
                {
                  top: `${-10 + i * 28}%`,
                  backgroundColor: t.brandMark,
                  transformOrigin: sweep === 'in' ? 'left' : 'right',
                  transform: [{ rotate: '-8deg' }, { scaleX: b }],
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ===== Resultado ===== */

function ResultScene({
  title,
  mark,
  count,
  countLabel,
  xp,
  accuracy,
  onContinue,
}: {
  title: string;
  mark: string;
  count: number;
  countLabel: string;
  xp: number;
  accuracy: number;
  onContinue: () => void;
}) {
  const { isDark } = useAppearance();
  const fg = isDark ? colors.dark.foreground : colors.foreground;
  const muted = isDark ? colors.dark.mutedForeground : colors.mutedForeground;
  const border = isDark ? colors.dark.border : colors.border;
  const green = isDark ? '#4ade80' : colors.green[600];
  const xpColor = isDark ? colors.family.brand : colors.family.brandEdge;
  const shownXp = useCountUp(xp, 700);
  const shownAccuracy = useCountUp(accuracy, 800);

  return (
    <View style={styles.resultWrap}>
      <View style={styles.resultHero}>
        {/* A arte tem 146 px vazios em cima (a do convite, 10): sobe 126/418 da largura */}
        <View style={[styles.frame, { width: HERO_MAX, height: HERO_MAX }]}>
          <Image
            source={WINNER}
            style={{ width: HERO_MAX, height: HERO_MAX * (627 / 418), marginTop: -HERO_MAX * 0.3014 }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
        <View style={styles.titleRow}>
          <Text style={[styles.resultTitle, { color: fg }]}>{title} </Text>
          <Marked text={mark} fontSize={28} color={fg} delay={750} />
        </View>
        <Text style={[styles.resultText, { color: muted }]}>Você está um passo mais perto da aprovação.</Text>
      </View>

      <View style={[styles.stats, { borderColor: border }]}>
        <Stat icon={<FileCheck size={20} color={green} />} value={String(count)} label={countLabel} color={green} muted={muted} />
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <Stat icon={<Zap size={20} color={xpColor} />} value={String(shownXp)} label="XP recebido" color={xpColor} muted={muted} />
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <Stat icon={<Target size={20} color={colors.blue[500]} />} value={`${shownAccuracy}%`} label="Precisão" color={colors.blue[500]} muted={muted} />
      </View>

      <GameButton variant="main" size="lg" fullWidth onPress={onContinue} style={{ marginTop: 24 }}>
        Continuar
      </GameButton>
    </View>
  );
}

function Stat({ icon, value, label, color, muted }: { icon: React.ReactNode; value: string; label: string; color: string; muted: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValueRow}>
        {icon}
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={[styles.statLabel, { color: muted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ===== Convite Premium ===== */

function PremiumInvite({ reduceMotion, onSkip }: { reduceMotion: boolean; onSkip: () => void }) {
  const { isDark } = useAppearance();
  const t = familyTokens(isDark);
  const fg = isDark ? colors.dark.foreground : colors.foreground;
  const muted = isDark ? colors.dark.mutedForeground : colors.mutedForeground;
  const { openSubscription } = useSubscriptionCheckout();
  const [index, setIndex] = useState(0);
  const [room, setRoom] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => setIndex((i) => (i + 1) % ENDINGS.length), 2400);
    }, 1600);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [reduceMotion]);

  // A boneca encolhe descontando a frase (cerca de 60 px) e nunca é cortada
  const hero = room > 0 ? Math.max(96, Math.min(HERO_MAX, room - 64)) : HERO_MAX;

  return (
    <View style={styles.inviteWrap}>
      <View style={styles.inviteRoom} onLayout={(e: LayoutChangeEvent) => setRoom(e.nativeEvent.layout.height)}>
        <View style={[styles.frame, { width: hero, height: hero }]}>
          <Image source={NAMED} style={{ width: hero, height: hero }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <Text style={[styles.inviteTitle, { color: fg }]}>Com Premium você</Text>
        <Marked key={index} text={ENDINGS[index]} fontSize={22} color={fg} delay={150} fadeIn={index > 0} />
      </View>

      <View style={styles.prices}>
        {/* Anual: cartão de escolha azul com base, etiqueta suspensa na borda */}
        <View style={[styles.planBase, { backgroundColor: BLUE }]}>
          <View style={[styles.plan, { borderColor: BLUE, backgroundColor: t.choiceSoft }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.planName, { color: fg }]}>Premium anual</Text>
              <Text style={[styles.planLine, { color: muted }]}>{YEARLY_PER_MONTH} por mês</Text>
            </View>
            <Text style={[styles.planPrice, { color: fg }]}>{YEARLY}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: BLUE }]}>
            <Text style={styles.tagText}>{DISCOUNT}</Text>
          </View>
        </View>

        <View style={[styles.anchor, { borderColor: t.line }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.anchorName, { color: muted }]}>Vade-mecum impresso</Text>
            <Text style={[styles.anchorLine, { color: muted }]}>Fica velho na próxima lei</Text>
          </View>
          <Text style={[styles.anchorPrice, { color: muted }]}>{VADE_MECUM}</Text>
        </View>
      </View>

      <BlueButton label={`Assinar por ${YEARLY}/ano`} onPress={openSubscription} />
      <GameButton variant="ghost" size="sm" fullWidth onPress={onSkip} style={{ marginTop: 4 }}>
        Prefiro não agora
      </GameButton>
    </View>
  );
}

/** Botão azul do Premium: face no azul do mapa e base no azul escuro, afunda ao tocar */
function BlueButton({ label, onPress }: { label: string; onPress: () => void }) {
  const depth = 4;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ marginTop: 16 }}>
      {({ pressed }) => (
        <View style={[styles.blueBase, { backgroundColor: BLUE_EDGE, paddingBottom: pressed ? 0 : depth, marginTop: pressed ? depth : 0 }]}>
          <View style={[styles.blueFace, { backgroundColor: pressed ? '#2563eb' : BLUE }]}>
            <Text style={styles.blueText}>{label}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/* ===== Peças ===== */

/** Palavra com o traço de marca-texto embaixo, que passa da esquerda para a direita */
function Marked({ text, fontSize, color, delay, fadeIn = false }: { text: string; fontSize: number; color: string; delay: number; fadeIn?: boolean }) {
  const { isDark } = useAppearance();
  const swipe = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(fadeIn ? 0 : 1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) {
        swipe.setValue(1);
        enter.setValue(1);
        return;
      }
      Animated.timing(enter, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(swipe, { toValue: 1, duration: 420, delay, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
    });
  }, []);

  return (
    <Animated.View
      style={{
        alignSelf: 'center',
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: -4,
          right: -4,
          bottom: fontSize * 0.12,
          height: fontSize * 0.42,
          borderRadius: 3,
          backgroundColor: familyTokens(isDark).brandMark,
          transformOrigin: 'left',
          transform: [{ scaleX: swipe }],
        }}
      />
      <Text style={{ fontSize, fontWeight: '800', color, lineHeight: fontSize * 1.2 }}>{text}</Text>
    </Animated.View>
  );
}

function useCountUp(target: number, delay = 0) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      const began = Date.now();
      frame = setInterval(() => {
        const p = Math.min(1, (Date.now() - began) / 900);
        setShown(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p >= 1 && frame) clearInterval(frame);
      }, 30);
    }, delay);
    return () => {
      clearTimeout(start);
      if (frame) clearInterval(frame);
    };
  }, [target]);
  return shown;
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  bands: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  band: { position: 'absolute', left: '-20%', width: '140%', height: '37%', borderRadius: 999 },
  frame: { overflow: 'hidden', alignItems: 'center' },

  resultWrap: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
  resultHero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  titleRow: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', flexWrap: 'wrap' },
  resultTitle: { fontSize: 28, fontWeight: '800', lineHeight: 28 * 1.2 },
  resultText: { marginTop: 8, fontSize: 16, textAlign: 'center' },
  stats: { flexDirection: 'row', borderWidth: 2, borderRadius: 16 },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  statDivider: { width: 2 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { marginTop: 2, fontSize: 13 },

  inviteWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  inviteRoom: { flex: 1, minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  inviteTitle: { fontSize: 22, fontWeight: '800', lineHeight: 22 * 1.2, textAlign: 'center' },
  prices: { marginTop: 16, gap: 8 },
  planBase: { borderRadius: 16, paddingBottom: 4 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2 },
  planName: { fontSize: 16, fontWeight: '800' },
  planLine: { fontSize: 14 },
  planPrice: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tag: { position: 'absolute', top: -10, right: 16, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  anchor: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed' },
  anchorName: { fontSize: 14, fontWeight: '800' },
  anchorLine: { fontSize: 12 },
  anchorPrice: { fontSize: 16, fontWeight: '800', textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  blueBase: { borderRadius: 12 },
  blueFace: { height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  blueText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});

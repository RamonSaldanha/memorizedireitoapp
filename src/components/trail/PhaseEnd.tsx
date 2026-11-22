import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FileCheck, Target, Zap } from 'lucide-react-native';
import type { DisciplineLevelUp } from '../../api/play';
import { GameButton } from '../ui/GameButton';
import { StarBadge } from '../ui/StarBadge';
import { useAppearance } from '../../hooks/useAppearance';
import { useSubscriptionCheckout } from '../../hooks/useSubscriptionCheckout';
import { colors, familyTokens } from '../../theme/colors';
import { BlueButton, Marked, YEARLY, YearlyPlan } from './PremiumPieces';

/**
 * Fim de fase do mapa novo, igual ao web (components/beta-preview/PhaseEnd.vue).
 * - Passagem marca-texto: quatro riscos atravessam a tela na diagonal, um depois do outro, até
 *   cobri-la; por baixo a tela troca, e os riscos saem pelo outro lado. Mesmo tom do traço do
 *   título (brandMark). Vale ao abrir (folha lisa → resultado) e em cada "Continuar": se a fase
 *   deu uma estrela, resultado → conquista; depois → convite Premium, só para quem não assina.
 *   Quem assina, ou pula o convite, sai (onDone).
 * - Com "reduzir movimento", troca direto.
 */

const WINNER = require('../../../assets/img/vencedora.gif');
const NAMED = require('../../../assets/img/premium-nomeado.gif');

// Referência de preço de um vade-mecum impresso atualizado (confirmar antes de publicar)
const VADE_MECUM = 'R$ 200+';
const ENDINGS = ['joga sem parar.', 'decora de vez.', 'avança mais rápido.', 'passa na prova.', 'é nomeado.'];

const BANDS = 4;
const STAGGER = 90;
const SWEEP = 260;
const EASE = Easing.bezier(0.65, 0, 0.35, 1);
// Moldura das ilustrações: as duas bonecas aparecem do mesmo tamanho
const HERO_MAX = 240;

type Stage = 'blank' | 'complete' | 'achievement' | 'invite';

export function PhaseEnd({
  title,
  mark,
  count,
  countLabel,
  xp,
  comboXp = 0,
  accuracy,
  premium,
  levelUp = null,
  onDone,
}: {
  title: string;
  mark: string;
  count: number;
  countLabel: string;
  xp: number;
  // A parte do XP que veio do combo de quem assina (Plus), mostrada embaixo dos números
  comboXp?: number;
  accuracy: number;
  premium: boolean;
  // A estrela que a fase deu (chega com o fim da fase), se deu
  levelUp?: DisciplineLevelUp | null;
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
      // A tela nova monta (e abre o GIF) neste instante; no Android isso come os primeiros
      // quadros, e a saída parecia sumir de uma vez. Espera ela desenhar para os riscos saírem
      // à vista, já com a origem trocada para a direita.
      setTimeout(
        () =>
          run(0).start(() => {
            setSweep(null);
            busy.current = false;
          }),
        120,
      );
    });
  }

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      reduce.current = r;
      highlightTo('complete');
    });
  }, []);

  function afterAchievement() {
    if (premium) onDone();
    else highlightTo('invite');
  }

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
          comboXp={comboXp}
          accuracy={accuracy}
          onContinue={() => (levelUp ? highlightTo('achievement') : afterAchievement())}
        />
      ) : stage === 'achievement' && levelUp ? (
        <AchievementScene levelUp={levelUp} reduceMotion={reduce.current} onContinue={afterAchievement} />
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
  comboXp,
  accuracy,
  onContinue,
}: {
  title: string;
  mark: string;
  count: number;
  countLabel: string;
  xp: number;
  comboXp: number;
  accuracy: number;
  onContinue: () => void;
}) {
  const { isDark } = useAppearance();
  const fg = isDark ? colors.dark.foreground : colors.foreground;
  const muted = isDark ? colors.dark.mutedForeground : colors.mutedForeground;
  const border = isDark ? colors.dark.border : colors.border;
  const green = isDark ? '#4ade80' : colors.green[600];
  const t = familyTokens(isDark);
  const xpColor = t.xpInk;
  const accuracyColor = isDark ? colors.family.brand : colors.family.brandEdge;
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
        <Stat icon={<Zap size={20} color={xpColor} fill={xpColor} />} value={String(shownXp)} label="XP recebido" color={xpColor} muted={muted} />
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <Stat icon={<Target size={20} color={accuracyColor} />} value={`${shownAccuracy}%`} label="Precisão" color={accuracyColor} muted={muted} />
      </View>

      {/* Quanto o combo rendeu a mais, para quem assina */}
      {comboXp > 0 ? (
        <View style={styles.comboBonus}>
          <Zap size={16} color={xpColor} fill={xpColor} />
          <Text style={[styles.comboBonusText, { color: xpColor }]}>
            +{comboXp} XP dos combos, por ser <Text style={{ color: t.plusInk }}>Plus</Text>
          </Text>
        </View>
      ) : null}

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

/* ===== Conquista ===== */

/** A estrela nova da disciplina, numa tela própria (antes era uma sobreposição no resultado) */
function AchievementScene({ levelUp, reduceMotion, onContinue }: { levelUp: DisciplineLevelUp; reduceMotion: boolean; onContinue: () => void }) {
  const { isDark } = useAppearance();
  const stars = levelUp.stars ?? levelUp.new_level;
  const fg = isDark ? colors.dark.foreground : colors.foreground;
  const muted = isDark ? colors.dark.mutedForeground : colors.mutedForeground;
  const pop = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.spring(pop, { toValue: 1, delay: 250, friction: 6, tension: 90, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={styles.resultWrap}>
      <View style={styles.resultHero}>
        <Text style={[styles.kicker, { color: muted }]}>Parabéns!</Text>
        <Animated.View style={{ marginTop: 16, opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
          <StarBadge badgeUrl={levelUp.badge_url} name={levelUp.discipline_name} stars={stars} icon={levelUp.icon} color={levelUp.color} size={200} />
        </Animated.View>
        <View style={[styles.titleRow, { marginTop: 20 }]}>
          <Text style={[styles.resultTitle, { color: fg }]}>Você ganhou </Text>
          <Marked text={stars === 1 ? 'a primeira estrela!' : 'uma estrela!'} fontSize={28} color={fg} delay={750} />
        </View>
        <Text style={[styles.resultText, { color: muted }]}>
          {stars} {stars === 1 ? 'estrela' : 'estrelas'} em {levelUp.discipline_name}
        </Text>
      </View>
      <GameButton variant="main" size="lg" fullWidth onPress={onContinue}>
        Continuar
      </GameButton>
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
        <Text style={[styles.inviteTitle, { color: fg }]}>Com o Plus você</Text>
        <Marked key={index} text={ENDINGS[index]} fontSize={22} color={fg} delay={150} fadeIn={index > 0} />
      </View>

      <View style={styles.prices}>
        {/* Anual: cartão de escolha azul com base, etiqueta suspensa na borda */}
        <YearlyPlan />

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

/* ===== Peças ===== */

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
  comboBonus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  comboBonusText: { fontSize: 14, fontWeight: '700' },
  fill: { flex: 1, overflow: 'hidden' },
  bands: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  band: { position: 'absolute', left: '-20%', width: '140%', height: '37%', borderRadius: 999 },
  frame: { overflow: 'hidden', alignItems: 'center' },

  resultWrap: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
  resultHero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  titleRow: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', flexWrap: 'wrap' },
  resultTitle: { fontSize: 28, fontWeight: '800', lineHeight: 28 * 1.2 },
  resultText: { marginTop: 8, fontSize: 16, textAlign: 'center' },
  kicker: { fontSize: 14, fontWeight: '700' },
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
  anchor: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed' },
  anchorName: { fontSize: 14, fontWeight: '800' },
  anchorLine: { fontSize: 12 },
  anchorPrice: { fontSize: 16, fontWeight: '800', textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
});

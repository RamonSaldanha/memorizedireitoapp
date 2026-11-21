import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Book, BookOpenCheck, Check, Lock, RotateCcw, Timer } from 'lucide-react-native';
import { trailApi, type TrailExamState, type TrailGroup, type TrailSection } from '../../api/trail';
import { AppHeader } from '../../components/layout/AppHeader';
import { WelcomeOfferBanner } from '../../components/WelcomeOfferBanner';
import { GameButton } from '../../components/ui/GameButton';
import { useAppearance } from '../../hooks/useAppearance';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useUserStore } from '../../stores/userStore';
import { colors } from '../../theme/colors';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Nav = NativeStackNavigationProp<PlayStackParamList>;

// === Grade (a mesma da web, BetaPlay/Map.vue) ===
// Tudo é medido em "U". A trilha tem 6 colunas de largura U; os quadrados ficam na esquerda,
// no centro ou na direita e descem uma linha por vez: centro → direita → centro → esquerda.
const COLUMNS = 6;
const MIN_UNIT = 40;
const MAX_UNIT = 60;
const COLUMN_PATTERN = [3, 5, 3, 1];
// Distância entre um quadrado e o seguinte, em U. Deixa espaço ao lado do caminho, onde fica o Dia da prova.
const ROW_STEP = 2.6;
const CENTER_COLUMN = 3;
// Quadrado atual: moldura com folga igual em volta, e a "borda de baixo" da face
const FRAME_GAP = 10;
const FACE_DEPTH = 6;
const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type Point = { x: number; y: number };

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** Tempo da prova por extenso: "9 min", "9 min 20 s" ou "45 s". */
function examTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return [minutes > 0 ? `${minutes} min` : '', rest > 0 ? `${rest} s` : ''].filter(Boolean).join(' ');
}

function examText(exam: TrailExamState) {
  switch (exam.state) {
    case 'locked':
      return 'Conclua todos os quadrados desta etapa, com os desafios, para liberar a prova.';
    case 'empty':
      return 'Ainda não há questões para os dispositivos desta etapa.';
    default:
      return `${plural(exam.questions, 'questão', 'questões')} que você já viu nos desafios desta etapa e ${examTime(exam.seconds)} para ir o mais longe que conseguir. Cada acerto vale ${exam.xp_per_correct} XP e errar não tira nada.`;
  }
}

/**
 * Mapa novo: etapas de uma lei, cada uma com quadrados de 4 fases, o desafio do quadrado
 * como 5º passo e o Dia da prova ao lado do último quadrado da etapa. Os dados e o desenho
 * são os da web; o cartão da etapa fica parado no topo e mostra a etapa que está no meio da tela.
 */
export function TrailMapScreen() {
  const navigation = useNavigation<Nav>();
  const { isDark, theme } = useAppearance();
  const { width } = useWindowDimensions();
  const lives = useUserStore((s) => s.lives);
  const hasInfiniteLives = useUserStore((s) => s.hasInfiniteLives);

  const [windowExtra, setWindowExtra] = useState({ before: 0, after: 0 });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trail-map', windowExtra.before, windowExtra.after],
    queryFn: async () => (await trailApi.map(windowExtra.before, windowExtra.after)).data,
    placeholderData: (previous) => previous,
  });

  const sections = data?.sections ?? [];

  const unit = Math.max(MIN_UNIT, Math.min(MAX_UNIT, Math.floor((width - 32) / COLUMNS)));
  const trailWidth = unit * COLUMNS;
  const nodeSize = unit * 1.5;
  const faceRadius = nodeSize * 0.24;
  const pathWidth = unit * 0.2;

  // A trilha é uma só: os quadrados de todas as etapas seguem ligados
  const flatGroups = useMemo(() => sections.flatMap((section) => section.groups), [sections]);
  const sectionOfGroup = useMemo(() => sections.flatMap((section, si) => section.groups.map(() => si)), [sections]);

  const trail = useMemo(() => {
    const count = flatGroups.length;
    // Um ponto a mais, só para saber para que lado vai o quadrado seguinte ao último
    const points: Point[] = Array.from({ length: count + 1 }, (_, i) => ({
      x: COLUMN_PATTERN[i % COLUMN_PATTERN.length] * unit,
      y: unit * 1.5 + i * unit * ROW_STEP,
    }));
    const last = count - 1;

    // Caminho em cotovelo: saindo do centro, anda de lado e desce; saindo da lateral, desce e anda de lado
    const connector = (from: Point, to: Point, index: number) => {
      const r = unit * 0.5;
      const dir = to.x > from.x ? 1 : -1;
      return index % 2 === 0
        ? `M ${from.x} ${from.y} H ${to.x - dir * r} Q ${to.x} ${from.y} ${to.x} ${from.y + r} V ${to.y}`
        : `M ${from.x} ${from.y} V ${to.y - r} Q ${from.x} ${to.y} ${from.x + dir * r} ${to.y} H ${to.x}`;
    };

    // Dia da prova: na lateral, na mesma linha; no centro, meia linha abaixo, na lateral livre
    const examPlacement = (from: Point, next: Point, index: number) => {
      if (index % 2 === 1) {
        const dir = from.x > CENTER_COLUMN * unit ? -1 : 1;
        const point = { x: from.x + dir * 2.5 * unit, y: from.y };
        return { point, d: `M ${from.x} ${from.y} H ${point.x}` };
      }
      const point = { x: 2 * from.x - next.x, y: from.y + (unit * ROW_STEP) / 2 };
      const r = unit * 0.5;
      const dir = point.x > from.x ? 1 : -1;
      return { point, d: `M ${from.x} ${from.y} V ${point.y - r} Q ${from.x} ${point.y} ${from.x + dir * r} ${point.y} H ${point.x}` };
    };

    let offset = 0;
    const exams = sections.flatMap((section) => {
      const index = offset + section.groups.length - 1;
      offset += section.groups.length;
      return section.groups.length > 0 ? [{ index, section, exam: section.exam, ...examPlacement(points[index], points[index + 1], index) }] : [];
    });

    const lastBelow = count > 0 && last % 2 === 0 && exams.some((e) => e.index === last);

    return {
      points: points.slice(0, count),
      exams,
      height: unit * 3 + Math.max(0, count - 1) * unit * ROW_STEP + (lastBelow ? unit * 0.9 : 0),
      connectors: points.slice(0, Math.max(0, count - 1)).map((point, i) => ({
        d: connector(point, points[i + 1], i),
        done: flatGroups[i].state === 'complete',
      })),
    };
  }, [flatGroups, sections, unit]);

  /* ===== Etapa no cartão e rolagem ===== */
  const scrollRef = useRef<ScrollView>(null);
  const trailTop = useRef(0);
  const viewport = useRef(0);
  const scrolledOnce = useRef(false);
  const heightBeforeAbove = useRef<number | null>(null);
  const scrollY = useRef(0);
  const [shownSection, setShownSection] = useState(0);

  useEffect(() => {
    const current = sections.findIndex((section) => section.is_current);
    setShownSection(Math.max(0, current));
  }, [data]);

  const rowAt = (y: number) =>
    Math.min(flatGroups.length - 1, Math.max(0, Math.round((y - trailTop.current - unit * 1.5) / (unit * ROW_STEP))));

  const updateShownSection = (offsetY: number) => {
    if (flatGroups.length === 0) return;
    const row = rowAt(offsetY + viewport.current / 2);
    setShownSection(sectionOfGroup[row] ?? 0);
  };

  // Ao abrir, o quadrado atual fica no meio da tela
  const scrollToCurrent = useCallback(() => {
    const index = flatGroups.findIndex((group) => group.state === 'current');
    if (index < 0 || !trail.points[index]) return;
    const y = trailTop.current + trail.points[index].y - viewport.current / 2;
    scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: false });
    updateShownSection(Math.max(0, y));
  }, [flatGroups, trail, sectionOfGroup]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    updateShownSection(scrollY.current);
  };

  // Trechos anteriores entram em cima: mantém na tela o que estava à vista
  const onContentSizeChange = (_w: number, height: number) => {
    if (heightBeforeAbove.current !== null) {
      const delta = height - heightBeforeAbove.current;
      heightBeforeAbove.current = null;
      if (delta > 0) scrollRef.current?.scrollTo({ y: scrollY.current + delta, animated: false });
      return;
    }
    if (!scrolledOnce.current && flatGroups.length > 0) {
      scrolledOnce.current = true;
      requestAnimationFrame(scrollToCurrent);
    }
  };

  const contentHeight = useRef(0);
  const loadMore = (direction: 'above' | 'below') => {
    if (direction === 'above') heightBeforeAbove.current = contentHeight.current;
    setWindowExtra((prev) => ({
      before: prev.before + (direction === 'above' ? 3 : 0),
      after: prev.after + (direction === 'below' ? 5 : 0),
    }));
  };

  /* ===== Abrir passos ===== */
  const [openGroupId, setOpenGroupId] = useState<number | null>(null);
  const [openExam, setOpenExam] = useState<number | null>(null);

  const openPhase = (phaseId: number) => {
    if (lives <= 0 && !hasInfiniteLives) {
      navigation.navigate('NoLives');
      return;
    }
    navigation.navigate('TrailPhase', { phaseId });
  };

  const openCurrentStep = (group: TrailGroup) => {
    if (group.current_phase_id) openPhase(group.current_phase_id);
    else if (group.challenge.key) navigation.navigate('TrailChallenge', { key: group.challenge.key });
  };

  const hasCurrentStep = (group: TrailGroup) => group.state === 'current' && (group.current_phase_id !== null || group.challenge.is_current);
  const hasChallenge = (group: TrailGroup) => group.challenge.key !== null && ['available', 'complete'].includes(group.challenge.state);

  /* ===== Telas ===== */

  if (isLoading && !data) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]} edges={['left', 'right']}>
        <ActivityIndicator size="large" color={colors.family.brandEdge} />
      </SafeAreaView>
    );
  }

  const section: TrailSection | undefined = sections[shownSection] ?? sections[0];
  const cardBorder = isDark ? colors.gray[700] : colors.gray[200];
  const cardBg = isDark ? colors.gray[800] : '#ffffff';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <AppHeader />
      <WelcomeOfferBanner />

      {isError && !data ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>Não foi possível carregar o mapa.</Text>
          <GameButton variant="purple" onPress={() => refetch()}>
            Tentar de novo
          </GameButton>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Book size={64} color={isDark ? colors.gray[600] : colors.gray[300]} />
          <Text style={[styles.emptyTitle, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>Nenhuma fase disponível</Text>
          <Text style={[styles.emptyText, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>Selecione legislações para estudar.</Text>
        </View>
      ) : (
        <View style={styles.flex}>
          {/* Cartão da etapa: um só, parado no topo; o título muda conforme a etapa que passa por ele */}
          {section ? (
            <View style={[styles.sectionCard, { width: trailWidth, backgroundColor: cardBg, borderColor: cardBorder, shadowColor: cardBorder }]}>
              <Text style={[styles.sectionLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>Etapa {section.number}</Text>
              <Text numberOfLines={1} style={[styles.sectionTitle, { color: isDark ? '#fff' : colors.gray[900] }]}>
                {section.legislation_title}
              </Text>
              <View style={[styles.sectionTrack, { backgroundColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
                <View style={[styles.sectionFill, { width: `${(section.completed_steps / Math.max(1, section.total_steps)) * 100}%` }]} />
              </View>
              <View style={[styles.cardEdge, { backgroundColor: cardBorder }]} />
            </View>
          ) : null}

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            onLayout={(e) => {
              viewport.current = e.nativeEvent.layout.height;
            }}
            onScroll={onScroll}
            scrollEventThrottle={32}
            onContentSizeChange={(w, h) => {
              contentHeight.current = h;
              onContentSizeChange(w, h);
            }}
            showsVerticalScrollIndicator={false}
          >
            {data?.hasMoreAbove ? (
              <MoreButton label="Ver trechos anteriores" width={trailWidth} onPress={() => loadMore('above')} />
            ) : null}

            <View
              style={{ width: trailWidth, height: trail.height }}
              onLayout={(e: LayoutChangeEvent) => {
                trailTop.current = e.nativeEvent.layout.y;
              }}
            >
              <Svg width={trailWidth} height={trail.height} style={StyleSheet.absoluteFill} pointerEvents="none">
                {trail.connectors.map((line, i) => (
                  <Path
                    key={i}
                    d={line.d}
                    fill="none"
                    strokeLinecap="round"
                    strokeWidth={pathWidth}
                    stroke={line.done ? (isDark ? '#166534' : colors.green[300]) : isDark ? colors.gray[700] : colors.gray[200]}
                  />
                ))}
                {/* Pontilhado até o Dia da prova */}
                {trail.exams.map((ex) => (
                  <Path
                    key={`exam-line-${ex.index}`}
                    d={ex.d}
                    fill="none"
                    strokeLinecap="round"
                    strokeWidth={pathWidth}
                    strokeDasharray={`0 ${pathWidth * 1.9}`}
                    stroke={
                      ex.exam.state === 'available'
                        ? isDark ? colors.purple[900] : colors.purple[300]
                        : ex.exam.state === 'complete'
                          ? isDark ? '#166534' : colors.green[300]
                          : isDark ? colors.gray[700] : colors.gray[200]
                    }
                  />
                ))}
              </Svg>

              {flatGroups.map((group, gi) => {
                const point = trail.points[gi];
                if (hasCurrentStep(group)) {
                  return (
                    <CurrentNode
                      key={group.id}
                      group={group}
                      point={point}
                      nodeSize={nodeSize}
                      faceRadius={faceRadius}
                      unit={unit}
                      onPress={() => openCurrentStep(group)}
                    />
                  );
                }
                if (group.state === 'complete') {
                  return (
                    <Node
                      key={group.id}
                      point={point}
                      size={nodeSize}
                      face={colors.green[500]}
                      edge={colors.green[700]}
                      onPress={() => {
                        setOpenExam(null);
                        setOpenGroupId(openGroupId === group.id ? null : group.id);
                      }}
                      label={group.challenge.state === 'available' ? 'Fases concluídas, desafio por fazer' : 'Fases concluídas'}
                    >
                      <Check size={nodeSize * 0.4} color="#fff" strokeWidth={3.5} />
                      {/* Desafio publicado depois que a pessoa passou por aqui: fica por fazer, sem travar */}
                      {group.challenge.state === 'available' ? (
                        <View style={[styles.challengeDot, { borderColor: theme.background }]}>
                          <BookOpenCheck size={14} color={colors.family.brandInk} strokeWidth={2.5} />
                        </View>
                      ) : null}
                    </Node>
                  );
                }
                return (
                  <Node
                    key={group.id}
                    point={point}
                    size={nodeSize}
                    face={isDark ? colors.gray[700] : colors.gray[200]}
                    edge={isDark ? colors.gray[800] : colors.gray[300]}
                    label="Bloqueado"
                  >
                    <Lock size={nodeSize / 3} color={isDark ? colors.gray[500] : colors.gray[400]} strokeWidth={2.5} />
                  </Node>
                );
              })}

              {/* Dia da prova: fase paralela, ligada ao último quadrado da etapa por um pontilhado */}
              {trail.exams.map((ex) => {
                const tone =
                  ex.exam.state === 'available'
                    ? { face: colors.purple[500], edge: colors.purple[700], icon: '#fff' }
                    : ex.exam.state === 'complete'
                      ? { face: colors.green[500], edge: colors.green[700], icon: '#fff' }
                      : {
                          face: isDark ? colors.gray[700] : colors.gray[200],
                          edge: isDark ? colors.gray[800] : colors.gray[300],
                          icon: isDark ? colors.gray[500] : colors.gray[400],
                        };
                return (
                  <Node
                    key={`exam-${ex.index}`}
                    point={ex.point}
                    size={nodeSize}
                    face={tone.face}
                    edge={tone.edge}
                    label={`Dia da prova da etapa ${ex.section.number}`}
                    onPress={() => {
                      setOpenGroupId(null);
                      setOpenExam(openExam === ex.index ? null : ex.index);
                    }}
                  >
                    <Timer size={nodeSize * 0.4} color={tone.icon} strokeWidth={2.5} />
                  </Node>
                );
              })}

              {/* Fases do quadrado concluído */}
              {flatGroups.map((group, gi) =>
                openGroupId === group.id ? (
                  <Popover key={`open-${group.id}`} top={trail.points[gi].y + nodeSize / 2 + 16} onClose={() => setOpenGroupId(null)}>
                    {group.phases.map((phase, pi) => (
                      <PopoverRow key={phase.id} label={`Fase ${pi + 1}`} action="Revisar" tone="green" onPress={() => openPhase(phase.id)} />
                    ))}
                    {/* O desafio é o último passo do quadrado */}
                    {hasChallenge(group) && group.challenge.key ? (
                      <PopoverRow
                        label={`Desafio: resumo e ${plural(group.challenge.questions, 'questão', 'questões')}`}
                        action={group.challenge.state === 'complete' ? 'Revisar' : 'Fazer'}
                        tone={group.challenge.state === 'complete' ? 'green' : 'purple'}
                        onPress={() => navigation.navigate('TrailChallenge', { key: group.challenge.key! })}
                      />
                    ) : null}
                  </Popover>
                ) : null,
              )}

              {trail.exams.map((ex) =>
                openExam === ex.index ? (
                  <Popover key={`open-exam-${ex.index}`} top={ex.point.y + nodeSize / 2 + 18} onClose={() => setOpenExam(null)} padded>
                    <Text style={[styles.examTitle, { color: isDark ? '#fff' : colors.gray[900] }]}>Dia da prova</Text>
                    <Text style={[styles.examText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{examText(ex.exam)}</Text>
                    {ex.exam.state === 'complete' ? (
                      <Text style={styles.examBest}>
                        Seu melhor resultado: {ex.exam.best_correct} de {plural(ex.exam.questions, 'acerto', 'acertos')}
                      </Text>
                    ) : null}
                    {ex.exam.state === 'locked' || ex.exam.state === 'empty' || !ex.exam.key ? (
                      <GameButton variant="white" size="lg" fullWidth disabled isDark={isDark} style={{ marginTop: 16 }}>
                        {ex.exam.state === 'locked' ? 'Bloqueado' : 'Sem questões ainda'}
                      </GameButton>
                    ) : (
                      <GameButton
                        variant={ex.exam.state === 'complete' && !ex.exam.in_progress ? 'second' : 'premium'}
                        size="lg"
                        fullWidth
                        style={{ marginTop: 16 }}
                        onPress={() => {
                          setOpenExam(null);
                          navigation.navigate('TrailExam', { key: ex.exam.key! });
                        }}
                      >
                        {ex.exam.in_progress ? 'Continuar a prova' : ex.exam.state === 'complete' ? 'Fazer de novo' : 'Abrir a prova'}
                      </GameButton>
                    )}
                  </Popover>
                ) : null,
              )}
            </View>

            {data?.hasMoreBelow ? <MoreButton label="Ver mais trechos" width={trailWidth} onPress={() => loadMore('below')} /> : null}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );

}

/* ===== Peças ===== */

/** Quadrado atual: abre direto o próximo passo (a fase ou o desafio), com o anel de progresso. */
function CurrentNode({
  group,
  point,
  nodeSize: size,
  faceRadius: radius,
  unit: u,
  onPress,
}: {
  group: TrailGroup;
  point: Point;
  nodeSize: number;
  faceRadius: number;
  unit: number;
  onPress: () => void;
}) {
  const outerW = size + FRAME_GAP * 2;
  const outerH = size + FRAME_GAP * 2 + FACE_DEPTH;
  const ring = size * 0.78;
  const ringOffset = RING_CIRCUMFERENCE * (1 - group.completed_steps / Math.max(1, group.total_steps));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        group.current_phase_id
          ? `Começar passo ${group.completed_steps + 1} de ${group.total_steps}`
          : `Começar o desafio: passo ${group.total_steps} de ${group.total_steps}`
      }
      style={[styles.node, { left: point.x - outerW / 2, top: point.y - outerH / 2, width: outerW, height: outerH }]}
    >
      {({ pressed }) => (
        <>
          <PulsingFrame radius={radius + FRAME_GAP} />
          {/* Borda de baixo da face */}
          <View
            style={{
              position: 'absolute',
              left: FRAME_GAP,
              top: FRAME_GAP + FACE_DEPTH,
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor: colors.blue[700],
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: FRAME_GAP,
              top: FRAME_GAP + (pressed ? FACE_DEPTH : 0),
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor: colors.blue[500],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Svg width={ring} height={ring} viewBox="0 0 80 80" style={{ position: 'absolute', left: (size - ring) / 2, top: (size - ring) / 2 }}>
              <Circle cx="40" cy="40" r={RING_RADIUS} fill="none" strokeWidth={7} stroke={colors.blue[700]} />
              <Circle
                cx="40"
                cy="40"
                r={RING_RADIUS}
                fill="none"
                strokeWidth={7}
                strokeLinecap="round"
                stroke="#ffffff"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 40 40)"
              />
            </Svg>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: u * 0.3 }}>
              {group.completed_steps}/{group.total_steps}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

/** Moldura do quadrado atual: pisca devagar para chamar o próximo passo. */
function PulsingFrame({ radius }: { radius: number }) {
  const { isDark } = useAppearance();
  const reduce = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce]);

  const borderColor = reduce
    ? colors.blue[400]
    : pulse.interpolate({
        inputRange: [0, 1],
        outputRange: isDark ? [colors.blue[900], colors.blue[400]] : [colors.blue[200], colors.blue[500]],
      });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { borderWidth: 4, borderRadius: radius, borderColor, backgroundColor: isDark ? colors.gray[900] : '#ffffff' }]}
    />
  );
}

/** Quadrado (ou Dia da prova) com a face colorida e a "borda de baixo" sólida, que afunda ao toque. */
function Node({
  point,
  size,
  face,
  edge,
  label,
  onPress,
  children,
}: {
  point: Point;
  size: number;
  face: string;
  edge: string;
  label: string;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const radius = size * 0.24;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      style={[styles.node, { left: point.x - size / 2, top: point.y - size / 2, width: size, height: size + FACE_DEPTH }]}
    >
      {({ pressed }) => (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: FACE_DEPTH, height: size, borderRadius: radius, backgroundColor: edge }} />
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: pressed && onPress ? FACE_DEPTH : 0,
              height: size,
              borderRadius: radius,
              backgroundColor: face,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {children}
          </View>
        </>
      )}
    </Pressable>
  );
}

/** Cartão aberto abaixo de um quadrado; tocar fora fecha. */
function Popover({ top, onClose, children, padded = false }: { top: number; onClose: () => void; children: React.ReactNode; padded?: boolean }) {
  const { isDark } = useAppearance();
  const border = isDark ? colors.gray[700] : colors.gray[200];
  return (
    <>
      <Pressable style={styles.popoverBackdrop} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={[styles.popover, { top, backgroundColor: isDark ? colors.gray[800] : '#fff', borderColor: border, padding: padded ? 20 : 12 }]}>
        {children}
        <View style={[styles.cardEdge, { backgroundColor: border }]} />
      </View>
    </>
  );
}

function PopoverRow({ label, action, tone, onPress }: { label: string; action: string; tone: 'green' | 'purple'; onPress: () => void }) {
  const { isDark } = useAppearance();
  const color = tone === 'green' ? (isDark ? '#4ade80' : colors.green[600]) : isDark ? colors.family.brand : colors.family.light.brandSoftInk;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.popoverRow, pressed && { backgroundColor: isDark ? colors.gray[700] : colors.gray[100] }]}
    >
      <Text style={[styles.popoverLabel, { color: isDark ? colors.gray[100] : colors.gray[800] }]} numberOfLines={2}>
        {label}
      </Text>
      <View style={styles.popoverAction}>
        {action === 'Revisar' ? <RotateCcw size={16} color={color} /> : <BookOpenCheck size={16} color={color} />}
        <Text style={[styles.popoverActionText, { color }]}>{action}</Text>
      </View>
    </Pressable>
  );
}

function MoreButton({ label, width, onPress }: { label: string; width: number; onPress: () => void }) {
  const { isDark } = useAppearance();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.more,
        { width, borderColor: isDark ? colors.gray[700] : colors.gray[200] },
        pressed && { backgroundColor: isDark ? colors.gray[800] : colors.gray[100] },
      ]}
    >
      <Text style={[styles.moreText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyText: { fontSize: 15, textAlign: 'center' },
  scrollContent: { alignItems: 'center', paddingTop: 12, paddingBottom: 32 },

  sectionCard: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    zIndex: 20,
  },
  cardEdge: { position: 'absolute', left: 12, right: 12, bottom: -6, height: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, zIndex: -1 },
  sectionLabel: { fontSize: 14 },
  sectionTitle: { marginTop: 2, fontSize: 18, fontWeight: '800' },
  sectionTrack: { marginTop: 12, height: 8, borderRadius: 999, overflow: 'hidden' },
  sectionFill: { height: '100%', borderRadius: 999, backgroundColor: colors.green[500] },

  node: { position: 'absolute', zIndex: 10 },
  challengeDot: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    backgroundColor: colors.family.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },

  popoverBackdrop: { position: 'absolute', left: -1000, right: -1000, top: -5000, bottom: -5000, zIndex: 20 },
  popover: { position: 'absolute', left: 0, right: 0, zIndex: 30, borderWidth: 2, borderRadius: 16 },
  popoverRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  popoverLabel: { flex: 1, fontSize: 14, fontWeight: '800' },
  popoverAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  popoverActionText: { fontSize: 14, fontWeight: '800' },
  examTitle: { fontSize: 18, fontWeight: '800' },
  examText: { marginTop: 4, fontSize: 14, lineHeight: 21 },
  examBest: { marginTop: 8, fontSize: 14, fontWeight: '800', color: colors.green[600] },

  more: { borderWidth: 2, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginVertical: 12 },
  moreText: { fontSize: 14, fontWeight: '800' },
});

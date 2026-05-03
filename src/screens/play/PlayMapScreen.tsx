import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Animated, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { playApi, Phase } from '../../api/play';
import { AppHeader } from '../../components/layout/AppHeader';
import { PhaseCircle } from '../../components/game/PhaseCircle';
import { colors } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Nav = NativeStackNavigationProp<PlayStackParamList, 'PlayMap'>;

// === Layout constants base (idênticos à versão web) ===
const VERTICAL_SPACING = 100;
const TRAIL_WIDTH = 200;
const X_PATTERN = [0, 35, 70, 105, 70, 35];
const ROAD_STROKE_WIDTH = 16;
const PADDING_TOP = 50;
const PADDING_BOTTOM = 20;
const PHASE_SIZE = { current: 90, complete: 64, blocked: 58, default: 62 } as const;

const SCROLL_THRESHOLD = 400;

function getPhaseSize(phase: Phase): number {
  if (phase.is_current) return PHASE_SIZE.current;
  if (phase.is_complete) return PHASE_SIZE.complete;
  if (phase.is_blocked) return PHASE_SIZE.blocked;
  return PHASE_SIZE.default;
}

/* ================================================================
   LegislationHeader — linhas laterais + nome da legislação
   ================================================================ */
function LegislationHeader({ title, isDark }: { title: string; isDark: boolean }) {
  return (
    <View style={styles.legislationRow}>
      <View style={[styles.legislationLine, { backgroundColor: isDark ? colors.gray[700] : colors.gray[300] }]} />
      <Text style={[styles.legislationText, { color: isDark ? colors.gray[400] : colors.gray[500] }]} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      <View style={[styles.legislationLine, { backgroundColor: isDark ? colors.gray[700] : colors.gray[300] }]} />
    </View>
  );
}

/* ================================================================
   StartBubble — balão "Começar!" com bounce
   ================================================================ */
function StartBubble({ phaseSize, isDark }: { phaseSize: number; isDark: boolean }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -8, duration: 800, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const bubbleBg = isDark ? colors.gray[800] : '#fff';
  const bubbleBorder = isDark ? colors.gray[700] : colors.gray[200];
  const textColor = isDark ? colors.gray[200] : colors.gray[700];

  return (
    <Animated.View
      style={[
        styles.bubbleWrapper,
        {
          bottom: phaseSize / 2 + 32,
          transform: [{ translateY: bounce }],
        },
      ]}
    >
      <View style={[styles.bubble, { backgroundColor: bubbleBg, borderColor: bubbleBorder }]}>
        <Text style={[styles.bubbleText, { color: textColor }]}>Começar!</Text>
        <View style={[styles.bubbleArrow, { borderTopColor: bubbleBg }]} />
      </View>
    </Animated.View>
  );
}

/* ================================================================
   PlayMapScreen
   ================================================================ */
export function PlayMapScreen() {
  const navigation = useNavigation<Nav>();
  const { isDark, theme } = useAppearance();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  // Fator responsivo idêntico à web (Map.vue:46-60)
  const scale = screenWidth < 400 ? 0.9 : screenWidth < 640 ? 0.95 : 1.0;

  const { data, isLoading } = useQuery({
    queryKey: ['play-map'],
    queryFn: () => playApi.getMap().then((r) => r.data),
    staleTime: 30_000,
  });

  // Estado local (mutável via load-more) — fonte da verdade após o boot
  const [phases, setPhases] = useState<Phase[]>([]);
  const [hasMoreAbove, setHasMoreAbove] = useState(false);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const [currentPhaseId, setCurrentPhaseId] = useState<number | null>(null);
  const [showSpinnerAbove, setShowSpinnerAbove] = useState(false);
  const [showSpinnerBelow, setShowSpinnerBelow] = useState(false);

  const isLoadingAbove = useRef(false);
  const isLoadingBelow = useRef(false);
  const lastScrollYRef = useRef(0);
  const lastContentHeightRef = useRef(0);
  const pendingPrependHeightRef = useRef<number | null>(null);
  const didInitialScrollRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  // Hidrata estado local quando a query inicial resolver
  useEffect(() => {
    if (data) {
      setPhases(data.phases);
      setHasMoreAbove(data.hasMoreAbove);
      setHasMoreBelow(data.hasMoreBelow);
      setCurrentPhaseId(data.currentPhaseId);
      didInitialScrollRef.current = false;
    }
  }, [data]);

  // Posições escaladas (idêntico à web Map.vue:63-70)
  const positions = useMemo(() =>
    phases.map((_, i) => ({
      x: (X_PATTERN[i % X_PATTERN.length] + PHASE_SIZE.current / 2) * scale,
      y: i * VERTICAL_SPACING * scale + VERTICAL_SPACING * scale + PADDING_TOP,
    })),
    [phases, scale]
  );

  // Path Bézier cúbico (idêntico à web Map.vue:78-93)
  const roadPath = useMemo(() => {
    if (positions.length < 2) return '';
    let d = `M ${positions[0].x} ${positions[0].y}`;
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      const cp1y = prev.y + (curr.y - prev.y) * 0.7;
      const cp2y = prev.y + (curr.y - prev.y) * 0.3;
      d += ` C ${prev.x} ${cp1y}, ${curr.x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [positions]);

  const totalHeight = positions.length * VERTICAL_SPACING * scale + PADDING_TOP + PADDING_BOTTOM;
  const trailWidth = TRAIL_WIDTH * scale;

  // === Carregar mais fases ABAIXO ===
  const loadBelow = useCallback(async () => {
    if (isLoadingBelow.current || phases.length === 0) return;
    isLoadingBelow.current = true;
    setShowSpinnerBelow(true);
    const cursor = phases[phases.length - 1].id;
    try {
      const { data: more } = await playApi.getMoreMapPhases('below', cursor, 20);
      if (more.phases.length === 0) {
        setHasMoreBelow(false);
      } else {
        setPhases((prev) => {
          // Normalizar show_legislation_header na fronteira
          const merged = [...prev];
          const first = { ...more.phases[0] };
          first.show_legislation_header = first.legislation_uuid !== prev[prev.length - 1]?.legislation_uuid;
          merged.push(first, ...more.phases.slice(1));
          return merged;
        });
        setHasMoreBelow(more.hasMore);
      }
    } catch (e) {
      // Silencioso — manter UI utilizável
    } finally {
      isLoadingBelow.current = false;
      setShowSpinnerBelow(false);
    }
  }, [phases]);

  // === Carregar mais fases ACIMA (preserva posição visual) ===
  const loadAbove = useCallback(async () => {
    if (isLoadingAbove.current || phases.length === 0) return;
    isLoadingAbove.current = true;
    setShowSpinnerAbove(true);
    const cursor = phases[0].id;
    pendingPrependHeightRef.current = lastContentHeightRef.current;
    try {
      const { data: more } = await playApi.getMoreMapPhases('above', cursor, 20);
      if (more.phases.length === 0) {
        setHasMoreAbove(false);
        pendingPrependHeightRef.current = null;
      } else {
        setPhases((prev) => {
          // Normalizar show_legislation_header na fronteira (último item do novo bloco vs primeiro do antigo)
          const newPhases = [...more.phases];
          const oldFirst = { ...prev[0] };
          oldFirst.show_legislation_header = oldFirst.legislation_uuid !== newPhases[newPhases.length - 1]?.legislation_uuid;
          return [...newPhases, oldFirst, ...prev.slice(1)];
        });
        setHasMoreAbove(more.hasMore);
      }
    } catch (e) {
      pendingPrependHeightRef.current = null;
    } finally {
      isLoadingAbove.current = false;
      setShowSpinnerAbove(false);
    }
  }, [phases]);

  // === onScroll: detecta proximidade das bordas ===
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    lastScrollYRef.current = contentOffset.y;

    if (contentOffset.y < SCROLL_THRESHOLD && hasMoreAbove && !isLoadingAbove.current) {
      loadAbove();
    }
    if (
      contentOffset.y + layoutMeasurement.height > contentSize.height - SCROLL_THRESHOLD &&
      hasMoreBelow &&
      !isLoadingBelow.current
    ) {
      loadBelow();
    }
  }, [hasMoreAbove, hasMoreBelow, loadAbove, loadBelow]);

  // === onContentSizeChange: restaura posição após prepend + auto-scroll inicial ===
  const onContentSizeChange = useCallback((_w: number, h: number) => {
    // 1) Restauração de posição após prepend
    if (pendingPrependHeightRef.current !== null) {
      const delta = h - pendingPrependHeightRef.current;
      pendingPrependHeightRef.current = null;
      if (delta > 0) {
        scrollRef.current?.scrollTo({
          y: lastScrollYRef.current + delta,
          animated: false,
        });
      }
    }

    lastContentHeightRef.current = h;

    // 2) Auto-scroll para a fase atual (uma vez)
    if (!didInitialScrollRef.current && currentPhaseId !== null && phases.length > 0) {
      const idx = phases.findIndex((p) => p.id === currentPhaseId);
      if (idx >= 0 && positions[idx]) {
        const targetY = positions[idx].y - screenHeight / 2;
        const clamped = Math.max(0, Math.min(targetY, h - screenHeight));
        scrollRef.current?.scrollTo({ y: clamped, animated: false });
        didInitialScrollRef.current = true;
      }
    }
  }, [currentPhaseId, phases, positions, screenHeight]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]} edges={['left', 'right']}>
        <ActivityIndicator size="large" color={colors.purple[500]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <AppHeader />

      {phases.length === 0 ? (
        <View style={[styles.center, { backgroundColor: theme.background }]}>
          <Text style={styles.emptyText}>Selecione legislações para começar</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          onScroll={onScroll}
          onContentSizeChange={onContentSizeChange}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.mapContainer, { width: trailWidth, height: totalHeight }]}>
            {/* Spinner topo */}
            {showSpinnerAbove && (
              <View style={[styles.spinnerWrap, { top: 8 }]} pointerEvents="none">
                <ActivityIndicator size="small" color={colors.purple[500]} />
              </View>
            )}

            {/* SVG da trilha */}
            <Svg
              width={trailWidth}
              height={totalHeight}
              viewBox={`0 0 ${trailWidth} ${totalHeight}`}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Path
                d={roadPath}
                fill="none"
                stroke={isDark ? colors.gray[700] : colors.gray[200]}
                strokeWidth={ROAD_STROKE_WIDTH * scale}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>

            {/* Headers de legislação */}
            {phases.map((p, i) =>
              p.show_legislation_header ? (
                <View
                  key={`hdr-${p.id}`}
                  style={[
                    styles.legislationWrapper,
                    {
                      top: positions[i].y - (VERTICAL_SPACING * scale) / 2 - 10,
                      left: trailWidth / 2 - 140,
                    },
                  ]}
                >
                  <LegislationHeader title={p.legislation_title} isDark={isDark} />
                </View>
              ) : null
            )}

            {/* Fases */}
            {phases.map((phase, i) => {
              const baseSize = getPhaseSize(phase);
              const size = baseSize * scale;
              return (
                <View
                  key={phase.id}
                  style={[
                    styles.phaseWrapper,
                    {
                      left: positions[i].x - size / 2,
                      top: positions[i].y - size / 2,
                      width: size,
                      height: size,
                    },
                  ]}
                >
                  {phase.is_current && !phase.is_blocked && (
                    <StartBubble phaseSize={size} isDark={isDark} />
                  )}

                  <View style={{ transform: [{ scale }], width: baseSize, height: baseSize }}>
                    <PhaseCircle
                      phase={phase}
                      isDark={isDark}
                      onPress={() => {
                        if (!phase.is_blocked) {
                          navigation.navigate('PlayPhase', { phaseId: phase.id });
                        }
                      }}
                    />
                  </View>
                </View>
              );
            })}

            {/* Spinner fim */}
            {showSpinnerBelow && (
              <View style={[styles.spinnerWrap, { bottom: 8 }]} pointerEvents="none">
                <ActivityIndicator size="small" color={colors.purple[500]} />
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: PADDING_BOTTOM,
  },

  mapContainer: {
    position: 'relative',
    overflow: 'visible',
  },

  /* ---------- Legislation Header ---------- */
  legislationWrapper: {
    position: 'absolute',
    width: 280,
    zIndex: 5,
  },
  legislationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legislationLine: {
    flex: 1,
    height: 1,
  },
  legislationText: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 8,
    maxWidth: 180,
  },

  /* ---------- Balão "Começar!" ---------- */
  bubbleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  bubbleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bubbleArrow: {
    position: 'absolute',
    marginTop: 15,
    top: '100%',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },

  /* ---------- Phase Wrapper ---------- */
  phaseWrapper: {
    position: 'absolute',
    zIndex: 10,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---------- Spinners ---------- */
  spinnerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },

  /* ---------- Empty ---------- */
  emptyText: {
    fontSize: 16,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

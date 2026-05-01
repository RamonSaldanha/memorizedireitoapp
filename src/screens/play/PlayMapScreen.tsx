import React, { useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Pressable, SafeAreaView, Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { playApi, Phase } from '../../api/play';
import { AppHeader } from '../../components/layout/AppHeader';
import { PhaseCircle } from '../../components/game/PhaseCircle';
import { colors } from '../../theme/colors';
import type { PlayStackParamList } from '../../navigation/AppTabs';

type Nav = NativeStackNavigationProp<PlayStackParamList, 'PlayMap'>;

// === Layout constants (idênticos à versão web) ===
const TRAIL_WIDTH = 200;
const VERTICAL_SPACING = 100;
const X_PATTERN = [0, 35, 70, 105, 70, 35];
const ROAD_STROKE_WIDTH = 16;
const PHASE_ITEM_HEIGHT = 130; // Aumentado para evitar corte do balão/base 3D
const LIST_PADDING_TOP = 50;
const LIST_PADDING_BOTTOM = 40;

// Tamanhos dos círculos (idênticos ao web)
const PHASE_SIZE = { current: 90, complete: 64, blocked: 58, default: 62 } as const;

function getPhaseSize(phase: Phase): number {
  if (phase.is_current) return PHASE_SIZE.current;
  if (phase.is_complete) return PHASE_SIZE.complete;
  if (phase.is_blocked) return PHASE_SIZE.blocked;
  return PHASE_SIZE.default;
}

function getPhaseX(index: number): number {
  const patternIdx = index % X_PATTERN.length;
  return X_PATTERN[patternIdx] + PHASE_SIZE.current / 2;
}

/* ================================================================
   Componente: RoadSegment
   Desenha o trecho de estrada entre a fase atual e a próxima.
   ================================================================ */
function RoadSegment({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) {
  const fromX = getPhaseX(fromIndex);
  const toX = getPhaseX(toIndex);
  const controlY1 = VERTICAL_SPACING * 0.7;
  const controlY2 = VERTICAL_SPACING * 0.3;

  const d = `M ${fromX} 0 C ${fromX} ${controlY1}, ${toX} ${controlY2}, ${toX} ${VERTICAL_SPACING}`;

  return (
    <Svg
      width={TRAIL_WIDTH}
      height={VERTICAL_SPACING}
      viewBox={`0 0 ${TRAIL_WIDTH} ${VERTICAL_SPACING}`}
      style={styles.roadSegment}
    >
      <Path
        d={d}
        fill="none"
        stroke={colors.gray[200]}
        strokeWidth={ROAD_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ================================================================
   Componente: LegislationHeader
   Linhas laterais + nome da legislação (igual ao web)
   ================================================================ */
function LegislationHeader({ title }: { title: string }) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLine} />
      <Text style={styles.headerText} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      <View style={styles.headerLine} />
    </View>
  );
}

/* ================================================================
   Componente: StartBubble
   Balão "Começar!" com seta triangular (igual ao web)
   ================================================================ */
function StartBubble({ phaseSize }: { phaseSize: number }) {
  const bounce = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.bubbleWrapper,
        {
          top: -(phaseSize / 2 + 40),
          transform: [{ translateY: bounce }],
        },
      ]}
    >
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>Começar!</Text>
        {/* Seta apontando para baixo */}
        <View style={styles.bubbleArrow} />
      </View>
    </Animated.View>
  );
}

/* ================================================================
   Componente: PhaseItem
   ================================================================ */
function PhaseItem({
  phase,
  index,
  phases,
  onPress,
}: {
  phase: Phase;
  index: number;
  phases: Phase[];
  onPress: () => void;
}) {
  const outerSize = getPhaseSize(phase);
  const circleLeft = getPhaseX(index) - outerSize / 2;
  const showHeader =
    index === 0 || phase.reference_uuid !== phases[index - 1]?.reference_uuid;

  return (
    <View style={[styles.phaseRow, { height: PHASE_ITEM_HEIGHT }]}>
      {/* Estrada até a próxima fase */}
      {index < phases.length - 1 && (
        <RoadSegment fromIndex={index} toIndex={index + 1} />
      )}

      {/* Header da legislação (posicionado no meio do espaço entre fases) */}
      {showHeader && (
        <View style={[styles.headerAbsolute, { left: circleLeft + outerSize / 2 }]}>
          <LegislationHeader title={phase.reference_name} />
        </View>
      )}

      {/* Círculo da fase + balão */}
      <View
        style={[
          styles.circleWrapper,
          {
            left: circleLeft,
            width: outerSize,
            height: outerSize,
            marginTop: -(outerSize / 2),
          },
        ]}
      >
        {/* Balão "Começar!" posicionado acima do círculo */}
        {phase.is_current && !phase.is_blocked && (
          <StartBubble phaseSize={outerSize} />
        )}

        <PhaseCircle phase={phase} onPress={onPress} />
      </View>

      {/* Label abaixo do círculo */}
      <View style={[styles.labelWrapper, { left: circleLeft + outerSize / 2 }]}>
        <Text
          style={[styles.phaseLabel, phase.is_blocked && styles.phaseLabelLocked]}
          numberOfLines={2}
        >
          {phase.is_review ? '↺ Revisão' : phase.reference_name.split(' ').slice(0, 2).join(' ')}
        </Text>
      </View>
    </View>
  );
}

/* ================================================================
   Screen principal
   ================================================================ */
export function PlayMapScreen() {
  const navigation = useNavigation<Nav>();
  const [journey, setJourney] = React.useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['play-map', journey],
    queryFn: () => playApi.getMap(journey || undefined),
    select: (res) => res.data,
    staleTime: 30_000,
  });

  const listRef = useRef<FlatList>(null);
  const phases = data?.phases ?? [];
  const journeyInfo = data?.journey;

  const handleLayout = useCallback(() => {
    if (journeyInfo?.current_phase_id && phases.length > 0) {
      const idx = phases.findIndex((p) => p.id === journeyInfo.current_phase_id);
      if (idx >= 0) {
        listRef.current?.scrollToIndex({
          index: idx,
          viewPosition: 0.4,
          animated: true,
        });
      }
    }
  }, [phases, journeyInfo]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.purple[500]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />

      {/* Navegação de jornadas */}
      {journeyInfo && journeyInfo.total > 1 && (
        <View style={styles.journeyNav}>
          <Pressable
            style={[styles.navBtn, !journeyInfo.has_previous && styles.navBtnDisabled]}
            onPress={() => setJourney(journeyInfo.current - 1)}
            disabled={!journeyInfo.has_previous}
          >
            <ChevronLeft
              size={20}
              color={journeyInfo.has_previous ? colors.purple[500] : colors.gray[300]}
            />
          </Pressable>
          <Text style={styles.journeyTitle}>
            {journeyInfo.journey_title ?? `Jornada ${journeyInfo.current}`}
          </Text>
          <Pressable
            style={[styles.navBtn, !journeyInfo.has_next && styles.navBtnDisabled]}
            onPress={() => setJourney(journeyInfo.current + 1)}
            disabled={!journeyInfo.has_next}
          >
            <ChevronRight
              size={20}
              color={journeyInfo.has_next ? colors.purple[500] : colors.gray[300]}
            />
          </Pressable>
        </View>
      )}

      {phases.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Selecione legislações para começar</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={phases}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          style={styles.flatList}
          onLayout={handleLayout}
          getItemLayout={(_, index) => ({
            length: PHASE_ITEM_HEIGHT,
            offset: PHASE_ITEM_HEIGHT * index,
            index,
          })}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item, index }) => (
            <PhaseItem
              phase={item}
              index={index}
              phases={phases}
              onPress={() => {
                if (!item.is_blocked) {
                  navigation.navigate('PlayPhase', { phaseId: item.id });
                }
              }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flatList: { overflow: 'visible' },
  list: {
    paddingTop: LIST_PADDING_TOP,
    paddingBottom: LIST_PADDING_BOTTOM,
    // Centraliza a trilha na tela
    alignItems: 'center',
  },
  journeyNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navBtn: { padding: 8 },
  navBtnDisabled: { opacity: 0.3 },
  journeyTitle: { fontSize: 14, fontWeight: '600', color: colors.gray[700] },

  /* ---------- PhaseRow ---------- */
  phaseRow: {
    width: TRAIL_WIDTH,
    position: 'relative',
    overflow: 'visible',
  },

  /* ---------- Estrada ---------- */
  roadSegment: {
    position: 'absolute',
    top: PHASE_ITEM_HEIGHT / 2, // começa no centro vertical do item
    left: 0,
    pointerEvents: 'none',
  },

  /* ---------- Header de Legislação ---------- */
  headerAbsolute: {
    position: 'absolute',
    top: -VERTICAL_SPACING / 2 - 10,
    width: 280,
    marginLeft: -140, // centraliza (-50%)
    zIndex: 5,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[300],
  },
  headerText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gray[500],
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
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    alignItems: 'center',
  },
  bubbleText: {
    color: colors.gray[700],
    fontSize: 13,
    fontWeight: '700',
  },
  bubbleArrow: {
    position: 'absolute',
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
    borderTopColor: '#fff',
  },

  /* ---------- Círculo da fase ---------- */
  circleWrapper: {
    position: 'absolute',
    top: PHASE_ITEM_HEIGHT / 2,
    zIndex: 10,
  },

  /* ---------- Label ---------- */
  labelWrapper: {
    position: 'absolute',
    top: PHASE_ITEM_HEIGHT / 2 + 44,
    marginLeft: -60,
    width: 120,
    alignItems: 'center',
    zIndex: 10,
  },
  phaseLabel: {
    fontSize: 12,
    color: colors.gray[600],
    fontWeight: '500',
    textAlign: 'center',
  },
  phaseLabelLocked: {
    color: colors.gray[300],
  },

  emptyText: {
    fontSize: 16,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

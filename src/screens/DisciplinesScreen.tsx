import React from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react-native';
import { disciplinesApi, DisciplineProgress } from '../api/disciplines';
import { colors } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';
import type { ThemeTokens } from '../stores/appearanceStore';

const RING_SIZE = 64;
const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = RING_SIZE / 2;

export function DisciplinesScreen() {
  const { isDark, theme } = useAppearance();

  const { data, isLoading } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => disciplinesApi.getProgress(),
    select: (res) => res.data,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator color={colors.purple[500]} size="large" />
      </SafeAreaView>
    );
  }

  const globalLevel = data?.global_level;
  const disciplines = data?.discipline_progress ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Text style={[styles.pageTitle, { color: theme.foreground }]}>Conquistas</Text>

      {/* Nível global */}
      {globalLevel && (
        <View style={[styles.globalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <GlobalProgressRing percent={globalLevel.progress_percent} level={globalLevel.level} isDark={isDark} />
          <View style={styles.globalInfo}>
            <Text style={[styles.globalLabel, { color: theme.foreground }]}>Nível Global</Text>
            <View style={styles.xpRow}>
              <Zap size={14} color={colors.yellow[500]} />
              <Text style={styles.globalXp}>
                {(data?.total_xp ?? 0).toLocaleString('pt-BR')} XP acumulados
              </Text>
            </View>
            <Text style={[styles.globalNext, { color: theme.mutedForeground }]}>
              {globalLevel.current_xp_in_level} / {globalLevel.xp_for_next_level} XP para o nível {globalLevel.level + 1}
            </Text>
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>EM PROGRESSO</Text>

      <FlatList
        data={disciplines}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => <DisciplineCard discipline={item} isDark={isDark} theme={theme} />}
      />
    </SafeAreaView>
  );
}

function GlobalProgressRing({ percent, level, isDark }: { percent: number; level: number; isDark: boolean }) {
  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * percent) / 100;

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={isDark ? colors.gray[700] : colors.gray[200]} strokeWidth={4} />
        <Circle
          cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
          stroke={colors.green[500]} strokeWidth={4}
          strokeDasharray={`${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90} origin={`${CENTER},${CENTER}`}
        />
      </Svg>
      <Text style={{ position: 'absolute', fontSize: 16, fontWeight: '800', color: isDark ? colors.gray[100] : colors.foreground }}>
        {level}
      </Text>
    </View>
  );
}

function DisciplineCard({ discipline, isDark, theme }: { discipline: DisciplineProgress; isDark: boolean; theme: ThemeTokens }) {
  const isLocked = discipline.total_xp === 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, isLocked && styles.cardLocked]}>
      <View style={[styles.iconCircle, { backgroundColor: discipline.color + '22', borderColor: discipline.color }]}>
        <Text style={{ fontSize: 20 }}>📚</Text>
      </View>
      <Text style={[styles.disciplineName, { color: theme.foreground }]} numberOfLines={2}>{discipline.name}</Text>
      <View style={[styles.progressBar, { backgroundColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${discipline.progress_percent}%`, backgroundColor: discipline.color },
          ]}
        />
      </View>
      <Text style={[styles.xpText, { color: theme.mutedForeground }]}>
        {discipline.total_xp > 0 ? `${discipline.total_xp} XP` : 'Bloqueado'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', padding: 16 },
  globalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  globalInfo: { flex: 1, gap: 4 },
  globalLabel: { fontSize: 14, fontWeight: '700' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  globalXp: { fontSize: 13, color: colors.yellow[600], fontWeight: '600' },
  globalNext: { fontSize: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  grid: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { gap: 8, marginBottom: 8 },
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    alignItems: 'center',
  },
  cardLocked: { opacity: 0.5 },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  disciplineName: {
    fontSize: 12, fontWeight: '700',
    textAlign: 'center',
  },
  progressBar: {
    width: '100%', height: 4, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
  xpText: { fontSize: 11 },
});

import React from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react-native';
import { disciplinesApi, DisciplineProgress } from '../api/disciplines';
import { colors } from '../theme/colors';

const RING_SIZE = 64;
const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = RING_SIZE / 2;

export function DisciplinesScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => disciplinesApi.getProgress(),
    select: (res) => res.data,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.purple[500]} size="large" />
      </SafeAreaView>
    );
  }

  const globalLevel = data?.global_level;
  const disciplines = data?.discipline_progress ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.pageTitle}>Conquistas</Text>

      {/* Nível global */}
      {globalLevel && (
        <View style={styles.globalCard}>
          <GlobalProgressRing percent={globalLevel.progress_percent} level={globalLevel.level} />
          <View style={styles.globalInfo}>
            <Text style={styles.globalLabel}>Nível Global</Text>
            <View style={styles.xpRow}>
              <Zap size={14} color={colors.yellow[500]} />
              <Text style={styles.globalXp}>
                {(data?.total_xp ?? 0).toLocaleString('pt-BR')} XP acumulados
              </Text>
            </View>
            <Text style={styles.globalNext}>
              {globalLevel.current_xp_in_level} / {globalLevel.xp_for_next_level} XP para o nível {globalLevel.level + 1}
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>EM PROGRESSO</Text>

      <FlatList
        data={disciplines}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => <DisciplineCard discipline={item} />}
      />
    </SafeAreaView>
  );
}

function GlobalProgressRing({ percent, level }: { percent: number; level: number }) {
  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * percent) / 100;

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={colors.gray[200]} strokeWidth={4} />
        <Circle
          cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
          stroke={colors.green[500]} strokeWidth={4}
          strokeDasharray={`${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90} origin={`${CENTER},${CENTER}`}
        />
      </Svg>
      <Text style={{ position: 'absolute', fontSize: 16, fontWeight: '800', color: colors.foreground }}>
        {level}
      </Text>
    </View>
  );
}

function DisciplineCard({ discipline }: { discipline: DisciplineProgress }) {
  const isLocked = discipline.total_xp === 0;

  return (
    <View style={[styles.card, isLocked && styles.cardLocked]}>
      <View style={[styles.iconCircle, { backgroundColor: discipline.color + '22', borderColor: discipline.color }]}>
        <Text style={{ fontSize: 20 }}>📚</Text>
      </View>
      <Text style={styles.disciplineName} numberOfLines={2}>{discipline.name}</Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${discipline.progress_percent}%`, backgroundColor: discipline.color },
          ]}
        />
      </View>
      <Text style={styles.xpText}>
        {discipline.total_xp > 0 ? `${discipline.total_xp} XP` : 'Bloqueado'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.foreground, padding: 16 },
  globalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  globalInfo: { flex: 1, gap: 4 },
  globalLabel: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  globalXp: { fontSize: 13, color: colors.yellow[600], fontWeight: '600' },
  globalNext: { fontSize: 12, color: colors.mutedForeground },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedForeground,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: 12, fontWeight: '700', color: colors.foreground,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%', height: 4, backgroundColor: colors.gray[200], borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
  xpText: { fontSize: 11, color: colors.mutedForeground },
});

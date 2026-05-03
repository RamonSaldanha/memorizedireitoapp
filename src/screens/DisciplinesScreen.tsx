import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Zap, BookOpen } from 'lucide-react-native';
import { disciplinesApi, DisciplineProgress } from '../api/disciplines';
import { DisciplineBadge } from '../components/ui/DisciplineBadge';
import { colors } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';
import type { ThemeTokens } from '../stores/appearanceStore';

const RING_SIZE = 64;
const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = RING_SIZE / 2;

export function DisciplinesScreen() {
  const { isDark, theme } = useAppearance();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => disciplinesApi.getProgress(),
    select: (res) => res.data,
    staleTime: 60_000,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['disciplines'] });
    }, []),
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator color={colors.purple[500]} size="large" />
      </SafeAreaView>
    );
  }

  const globalLevel = data?.global_level;
  const allDisciplines = data?.discipline_progress ?? [];
  const active = allDisciplines.filter((d) => d.total_xp > 0);
  const inactive = allDisciplines.filter((d) => d.total_xp === 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={null}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <>
            <Text style={[styles.pageTitle, { color: theme.foreground }]}>Conquistas</Text>

            {/* Nível global */}
            {globalLevel && (
              <View style={[styles.globalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <GlobalProgressRing percent={globalLevel.progress_percent} level={globalLevel.level} isDark={isDark} />
                <View style={styles.globalInfo}>
                  <Text style={[styles.globalLabel, { color: theme.foreground }]}>Nivel Global</Text>
                  <View style={styles.xpRow}>
                    <Zap size={12} color={colors.yellow[500]} />
                    <Text style={styles.globalXp}>
                      {(data?.total_xp ?? 0).toLocaleString('pt-BR')} XP acumulados
                    </Text>
                  </View>
                  <Text style={[styles.globalNext, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
                    {globalLevel.current_xp_in_level} / {globalLevel.xp_for_next_level} XP para o nivel {globalLevel.level + 1}
                  </Text>
                </View>
              </View>
            )}

            {/* Em progresso */}
            {active.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
                  EM PROGRESSO
                </Text>
                <DisciplineGrid disciplines={active} isDark={isDark} theme={theme} locked={false} />
              </>
            )}

            {/* Para desbloquear */}
            {inactive.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
                  PARA DESBLOQUEAR
                </Text>
                <DisciplineGrid disciplines={inactive} isDark={isDark} theme={theme} locked />
              </>
            )}

            {/* Estado vazio */}
            {allDisciplines.length === 0 && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.gray[800] : colors.gray[100] }]}>
                  <BookOpen size={32} color={colors.gray[400]} />
                </View>
                <Text style={[styles.emptyTitle, { color: isDark ? colors.gray[400] : colors.gray[600] }]}>
                  Nenhuma conquista disponível
                </Text>
                <Text style={[styles.emptyBody, { color: colors.gray[500] }]}>
                  As conquistas serão criadas pelo administrador. Comece a estudar para ver seu progresso!
                </Text>
              </View>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function GlobalProgressRing({ percent, level, isDark }: { percent: number; level: number; isDark: boolean }) {
  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * percent) / 100;
  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={isDark ? colors.gray[700] : colors.gray[100]} strokeWidth={4} />
        <Circle
          cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
          stroke={colors.green[500]} strokeWidth={4}
          strokeDasharray={`${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90, ${CENTER}, ${CENTER})`}
        />
      </Svg>
      <Text style={{ position: 'absolute', fontSize: 18, fontWeight: '900', color: isDark ? '#fff' : colors.gray[900] }}>
        {level}
      </Text>
    </View>
  );
}

function DisciplineGrid({
  disciplines, isDark, theme, locked,
}: {
  disciplines: DisciplineProgress[];
  isDark: boolean;
  theme: ThemeTokens;
  locked: boolean;
}) {
  const pairs: DisciplineProgress[][] = [];
  for (let i = 0; i < disciplines.length; i += 2) {
    pairs.push(disciplines.slice(i, i + 2));
  }

  return (
    <View style={styles.grid}>
      {pairs.map((pair, i) => (
        <View key={i} style={styles.row}>
          {pair.map((d) => (
            <DisciplineCard key={d.id} discipline={d} isDark={isDark} theme={theme} locked={locked} />
          ))}
          {pair.length === 1 && <View style={styles.cardSpacer} />}
        </View>
      ))}
    </View>
  );
}

function DisciplineCard({
  discipline, isDark, theme, locked,
}: {
  discipline: DisciplineProgress;
  isDark: boolean;
  theme: ThemeTokens;
  locked: boolean;
}) {
  const barWidth = Math.max(discipline.progress_percent, locked ? 0 : 3);

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: locked
          ? (isDark ? 'rgba(31,41,55,0.4)' : colors.gray[50])
          : theme.card,
        borderColor: locked
          ? (isDark ? colors.gray[700] : colors.gray[200])
          : (isDark ? colors.gray[700] : colors.gray[100]),
        borderStyle: locked ? 'dashed' : 'solid',
        opacity: locked ? 0.6 : 1,
      },
    ]}>
      {/* Extra paddingBottom absorbs the shield's -8px overflow */}
      <View style={{ paddingBottom: 8 }}>
        <DisciplineBadge
          icon={discipline.icon}
          color={discipline.color}
          level={locked ? 0 : discipline.level}
          locked={locked}
          isDark={isDark}
        />
      </View>

      <Text
        style={[styles.disciplineName, { color: locked ? theme.mutedForeground : theme.foreground }]}
        numberOfLines={2}
      >
        {discipline.name}
      </Text>

      <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
        {!locked && (
          <View style={[styles.progressFill, { width: `${barWidth}%`, backgroundColor: discipline.color }]} />
        )}
      </View>

      <Text style={[styles.xpText, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
        {locked
          ? `0 XP / ${discipline.xp_for_next_level} XP`
          : `${discipline.current_xp_in_level} XP / ${discipline.xp_for_next_level} XP`
        }
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', paddingVertical: 20 },
  globalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  globalInfo: { flex: 1, gap: 4 },
  globalLabel: { fontSize: 14, fontWeight: '700' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  globalXp: { fontSize: 12, color: colors.gray[500] },
  globalNext: { fontSize: 11 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  grid: { gap: 12, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 12 },
  cardSpacer: { flex: 1 },
  card: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  disciplineName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  xpText: { fontSize: 11, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyBody: { fontSize: 13, textAlign: 'center', maxWidth: 260 },
});

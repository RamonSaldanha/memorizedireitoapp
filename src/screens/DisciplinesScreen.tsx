import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { TrendingUp, BookOpen } from 'lucide-react-native';
import { disciplinesApi, DisciplineProgress } from '../api/disciplines';
import { DisciplineBadge } from '../components/ui/DisciplineBadge';
import { colors } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';
import type { ThemeTokens } from '../stores/appearanceStore';

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
                {/* Linha 1: badge + título + barra */}
                <View style={styles.globalTopRow}>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeText}>{globalLevel.level}</Text>
                  </View>
                  <View style={styles.globalTopInfo}>
                    <View style={styles.globalTitleRow}>
                      <Text style={[styles.globalTitle, { color: theme.foreground }]}>Nível Global</Text>
                      <Text style={[styles.percentText, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
                        {globalLevel.progress_percent}% concluído
                      </Text>
                    </View>
                    <View style={[styles.globalBarTrack, { backgroundColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
                      <View style={[styles.globalBarFill, { width: `${Math.max(globalLevel.progress_percent, 2)}%` }]} />
                    </View>
                  </View>
                </View>

                {/* Linha 2: rodapé em 2 colunas */}
                <View style={[styles.globalFooter, { borderTopColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
                  <View style={styles.footerCol}>
                    <Text style={[styles.footerLabel, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>XP acumulado</Text>
                    <Text style={[styles.footerValue, { color: theme.foreground }]}>
                      {(data?.total_xp ?? 0).toLocaleString('pt-BR')}
                    </Text>
                  </View>
                  <View style={[styles.footerCol, styles.footerColRight]}>
                    <View style={styles.footerLabelRow}>
                      <Text style={[styles.footerLabel, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
                        Para o nível {globalLevel.level + 1}
                      </Text>
                      <TrendingUp size={14} color={isDark ? colors.gray[500] : colors.gray[400]} />
                    </View>
                    <Text style={[styles.footerValue, { color: theme.foreground }]}>
                      {globalLevel.xp_for_next_level.toLocaleString('pt-BR')}
                      <Text style={[styles.footerValueXp, { color: isDark ? colors.gray[400] : colors.gray[500] }]}> XP</Text>
                    </Text>
                  </View>
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
          : (isDark ? colors.gray[700] : colors.gray[200]),
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
        style={[
          styles.disciplineName,
          { color: locked ? theme.mutedForeground : theme.foreground, fontWeight: locked ? '500' : '700' },
        ]}
        numberOfLines={2}
      >
        {discipline.name}
      </Text>

      <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
        {!locked && (
          <View style={[styles.progressFill, { width: `${barWidth}%`, backgroundColor: discipline.color }]} />
        )}
      </View>

      <Text style={[styles.xpText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
        {locked
          ? `0 / ${discipline.xp_for_next_level} XP`
          : `${discipline.current_xp_in_level} / ${discipline.xp_for_next_level} XP`
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
    flexDirection: 'column',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  globalTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.purple[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  globalTopInfo: { flex: 1 },
  globalTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  globalTitle: { fontSize: 18, fontWeight: '700' },
  percentText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  globalBarTrack: { height: 12, borderRadius: 999, overflow: 'hidden' },
  globalBarFill: { height: '100%', borderRadius: 999, backgroundColor: colors.green[600] },
  globalFooter: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  footerCol: { flex: 1 },
  footerColRight: { alignItems: 'flex-end' },
  footerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  footerValue: { fontSize: 16, fontWeight: '700' },
  footerValueXp: { fontSize: 13, fontWeight: '400' },
  sectionLabel: {
    fontSize: 12,
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
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  xpText: { fontSize: 12, fontWeight: '500', marginTop: 8 },
  emptyState: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyBody: { fontSize: 13, textAlign: 'center', maxWidth: 260 },
});

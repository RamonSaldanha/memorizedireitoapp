import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { BookOpen, Star, Trophy } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { disciplinesApi, DisciplineProgress } from '../api/disciplines';
import { StarBadge, StarRow } from '../components/ui/StarBadge';
import { colors, familyTokens } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';
import type { ThemeTokens } from '../stores/appearanceStore';
import { AppHeader } from '../components/layout/AppHeader';

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
        <ActivityIndicator color={colors.family.brandEdge} size="large" />
      </SafeAreaView>
    );
  }

  const globalLevel = data?.global_level;
  const allDisciplines = data?.discipline_progress ?? [];
  // Como na web: as que têm estrela, das mais estreladas para as menos; as outras, para desbloquear
  const active = allDisciplines
    .filter((d) => d.stars > 0)
    .sort((a, b) => b.stars - a.stars || b.total_xp - a.total_xp);
  const inactive = allDisciplines.filter((d) => d.stars === 0);
  const starsEarned = allDisciplines.reduce((sum, d) => sum + d.stars, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <AppHeader />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={null}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <>
            <Text style={[styles.pageTitle, { color: theme.foreground }]}>Conquistas</Text>

            {/* Nível global: medalha, XP total, barra e quanto falta (como no site) */}
            {globalLevel && <LevelCard level={globalLevel} totalXp={data?.total_xp ?? 0} isDark={isDark} theme={theme} />}

            {/* Em progresso */}
            {active.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={[styles.sectionLabel, styles.sectionLabelInRow, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
                    EM PROGRESSO
                  </Text>
                  <View style={styles.starsTotal}>
                    <Star size={14} color={colors.amber[400]} fill={colors.amber[400]} strokeWidth={0} />
                    <Text style={[styles.starsTotalText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
                      {starsEarned} de {allDisciplines.length * 5}
                    </Text>
                  </View>
                </View>
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

type GlobalLevel = { level: number; current_xp_in_level: number; xp_for_next_level: number; progress_percent: number };

/**
 * O cartão de nível do site (pages/Disciplines/Index.vue): medalha em hexágono no amarelo do
 * logo, o nível, o XP total, uma barra e quanto falta. xp_for_next_level é o XP que o nível
 * inteiro pede; o que falta é a diferença.
 */
function LevelCard({ level, totalXp, isDark, theme }: { level: GlobalLevel; totalXp: number; isDark: boolean; theme: ThemeTokens }) {
  const toNext = Math.max(0, level.xp_for_next_level - level.current_xp_in_level);
  const fmt = (n: number) => n.toLocaleString('pt-BR');
  const f = colors.family;

  return (
    <View style={[styles.levelCard, { backgroundColor: theme.card, borderColor: theme.border }]} accessibilityLabel={`Nível ${level.level}`}>
      <View style={styles.levelTop}>
        <View style={styles.medal} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Svg viewBox="0 0 64 72" width={64} height={72} style={StyleSheet.absoluteFill}>
            <Path d="M32 3 59 18.5v35L32 69 5 53.5v-35Z" fill={f.brandEdge} />
            <Path d="M32 3 59 18.5v31L32 65 5 49.5v-31Z" fill={f.brand} />
            <Path d="M32 11 52 22.5v23L32 57 12 45.5v-23Z" fill="none" stroke={f.brandInk} strokeOpacity={0.18} strokeWidth={2} />
          </Svg>
          <Text style={[styles.medalNumber, { color: f.brandInk }]}>{level.level}</Text>
        </View>
        <View style={styles.levelInfo}>
          <Text style={[styles.levelTitle, { color: theme.foreground }]}>Nível {level.level}</Text>
          <Text style={[styles.levelSub, { color: theme.mutedForeground }]}>{fmt(totalXp)} XP no total</Text>
        </View>
      </View>

      <View style={[styles.levelTrack, { backgroundColor: theme.muted }]}>
        <View style={[styles.levelFill, { width: `${Math.max(level.progress_percent, 3)}%`, backgroundColor: f.brand }]} />
      </View>
      <Text style={[styles.levelSub, styles.levelRemaining, { color: theme.mutedForeground }]}>
        Faltam <Text style={{ fontWeight: '700', color: theme.foreground }}>{fmt(toNext)} XP</Text> para o nível {level.level + 1}
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
  const family = familyTokens(isDark);
  // XP total em relação à próxima estrela, a mesma medida do texto embaixo
  const nextStarPercent = discipline.next_star_xp === null ? 100 : Math.min(100, (discipline.total_xp / Math.max(1, discipline.next_star_xp)) * 100);
  const barWidth = Math.max(nextStarPercent, locked ? 0 : 3);

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: locked ? 'transparent' : theme.card,
        borderColor: theme.border,
        borderStyle: locked ? 'dashed' : 'solid',
        opacity: locked ? 0.6 : 1,
      },
    ]}>
      {/* A arte nova tem 15% de área transparente embaixo da fita: desconta para o nome ficar perto.
          O badge antigo transborda 8 px e ganha esse espaço. */}
      <View style={{ paddingBottom: discipline.badge_url ? 0 : 8, marginBottom: discipline.badge_url ? -Math.round(128 * 0.15) : 0 }}>
        <StarBadge
          badgeUrl={discipline.badge_url}
          name={discipline.name}
          stars={locked ? 0 : discipline.stars}
          icon={discipline.icon}
          color={discipline.color}
          size={128}
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

      {/* A arte nova já mostra as estrelas; a fileira só aparece no badge antigo */}
      {!locked && !discipline.badge_url ? <View style={{ marginTop: 6 }}><StarRow stars={discipline.stars} /></View> : null}
      {!locked && discipline.next_star_xp === null ? (
        <View style={[styles.completePill, { backgroundColor: family.brandSoft }]}>
          <Trophy size={12} color={family.brandSoftInk} />
          <Text style={[styles.completeText, { color: family.brandSoftInk }]}>Completa</Text>
        </View>
      ) : null}

      {!locked ? (
        <View style={[styles.progressTrack, { backgroundColor: theme.muted }]}>
          <View style={[styles.progressFill, { width: `${barWidth}%`, backgroundColor: discipline.color }]} />
        </View>
      ) : null}

      <Text style={[styles.xpText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
        {locked
          ? 'Conclua um bloco para ganhar a 1ª estrela'
          : discipline.next_star_xp !== null
            ? `Faltam ${(discipline.next_star_xp - discipline.total_xp).toLocaleString('pt-BR')} XP para a ${discipline.stars + 1}ª estrela`
            : `${discipline.total_xp.toLocaleString('pt-BR')} XP`}
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
  levelCard: { padding: 20, borderRadius: 24, borderWidth: 2, marginBottom: 24 },
  levelTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  medal: { width: 64, height: 72, alignItems: 'center', justifyContent: 'center' },
  medalNumber: { fontSize: 24, fontWeight: '700', marginTop: -4, fontVariant: ['tabular-nums'] },
  levelInfo: { flex: 1, minWidth: 0 },
  levelTitle: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
  levelSub: { fontSize: 14, marginTop: 2 },
  levelTrack: { height: 12, borderRadius: 999, overflow: 'hidden', marginTop: 16 },
  levelFill: { height: '100%', borderRadius: 999 },
  levelRemaining: { marginTop: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionLabelInRow: { marginBottom: 0 },
  starsTotal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starsTotalText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  completePill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 },
  completeText: { fontSize: 12, fontWeight: '700' },
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
    paddingBottom: 14,
    borderRadius: 24,
    borderWidth: 2,
    gap: 4,
  },
  disciplineName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  xpText: { fontSize: 12, fontWeight: '500', marginTop: 8, textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyBody: { fontSize: 13, textAlign: 'center', maxWidth: 260 },
});

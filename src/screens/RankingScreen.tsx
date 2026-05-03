import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Pressable, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Crown, Medal, Zap, Flame, TrendingUp, Trophy } from 'lucide-react-native';
import { rankingApi, RankingUser } from '../api/ranking';
import { colors } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';
import type { ThemeTokens } from '../stores/appearanceStore';

type Period = 'daily' | 'weekly' | 'all';

const PERIODS: { key: Period; label: string; Icon: React.FC<{ size: number; color?: string }> }[] = [
  { key: 'daily', label: 'Hoje', Icon: Flame },
  { key: 'weekly', label: 'Semana', Icon: TrendingUp },
  { key: 'all', label: 'Geral', Icon: Trophy },
];

const POSITION_STYLES: Record<number, {
  badgeBg: string;
  avatarBg: string;
  avatarText: string;
  avatarRing: string;
  ringBorder: string;
  nameIconColor: string;
}> = {
  1: {
    badgeBg: colors.yellow[500],
    avatarBg: colors.yellow[100],
    avatarText: colors.yellow[700],
    avatarRing: colors.yellow[400],
    ringBorder: colors.yellow[400],
    nameIconColor: colors.yellow[600],
  },
  2: {
    badgeBg: colors.blue[500],
    avatarBg: colors.blue[100],
    avatarText: colors.blue[700],
    avatarRing: colors.blue[400],
    ringBorder: colors.blue[400],
    nameIconColor: colors.blue[600],
  },
  3: {
    badgeBg: colors.purple[500],
    avatarBg: colors.purple[100],
    avatarText: colors.purple[700],
    avatarRing: colors.purple[400],
    ringBorder: colors.purple[400],
    nameIconColor: colors.purple[600],
  },
};

function getNameIcon(position: number) {
  if (position === 1) return Crown;
  if (position <= 3) return Medal;
  return null;
}

export function RankingScreen() {
  const [period, setPeriod] = useState<Period>('all');
  const { isDark, theme } = useAppearance();

  const { data, isLoading } = useQuery({
    queryKey: ['ranking', period],
    queryFn: () => rankingApi.getRanking(period),
    select: (res) => res.data,
    staleTime: 60_000,
  });

  const topUsers = data?.top_users ?? [];
  const currentUserData = data?.current_user_data;
  const currentUserPosition = data?.current_user_position;

  const isEmpty = !isLoading && topUsers.length === 0;

  const showCurrentUserAtBottom =
    currentUserData &&
    currentUserPosition &&
    !topUsers.some((u) => u.is_current_user);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.foreground }]}>Ranking</Text>
      </View>

      {/* Period tabs — pill style matching web */}
      <View style={styles.tabsWrap}>
        <View style={[styles.tabsContainer, { backgroundColor: theme.muted }]}>
          {PERIODS.map((p) => {
            const isActive = period === p.key;
            const Icon = p.Icon;
            return (
              <Pressable
                key={p.key}
                style={[
                  styles.tab,
                  isActive && {
                    backgroundColor: isDark ? colors.gray[700] : colors.background,
                    shadowColor: '#000',
                  },
                ]}
                onPress={() => setPeriod(p.key)}
              >
                <Icon
                  size={14}
                  color={
                    isActive
                      ? theme.foreground
                      : theme.mutedForeground
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    isActive
                      ? { color: theme.foreground }
                      : { color: theme.mutedForeground },
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.purple[500]} />
      ) : isEmpty ? (
        /* Empty state — matching web */
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.gray[800] : colors.gray[100] }]}>
            <Trophy size={32} color={colors.gray[400]} />
          </View>
          <Text style={[styles.emptyTitle, { color: isDark ? colors.gray[400] : colors.gray[600] }]}>
            Nenhum ranking disponivel
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.gray[500] }]}>
            {period === 'daily'
              ? 'Ninguém ganhou XP hoje ainda. Seja o primeiro!'
              : period === 'weekly'
                ? 'Ninguém ganhou XP esta semana. Seja o primeiro!'
                : 'Comece a estudar para aparecer no ranking!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={topUsers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            showCurrentUserAtBottom ? (
              <CurrentUserFooter
                user={currentUserData}
                isDark={isDark}
                theme={theme}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <RankingRow
              user={item}
              isCurrentUser={item.is_current_user}
              isDark={isDark}
              theme={theme}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function CurrentUserFooter({ user, isDark, theme }: {
  user: RankingUser;
  isDark: boolean;
  theme: ThemeTokens;
}) {
  return (
    <View>
      <View style={styles.separatorWrap}>
        <View style={[styles.separatorLine, { borderColor: isDark ? colors.gray[600] : colors.gray[300] }]} />
        <Text style={[styles.separatorText, { color: colors.gray[400] }]}>...</Text>
        <View style={[styles.separatorLine, { borderColor: isDark ? colors.gray[600] : colors.gray[300] }]} />
      </View>
      <RankingRow user={user} isCurrentUser isDark={isDark} theme={theme} />
    </View>
  );
}

function RankingRow({ user, isCurrentUser, isDark, theme }: {
  user: RankingUser;
  isCurrentUser: boolean;
  isDark: boolean;
  theme: ThemeTokens;
}) {
  const pos = user.position;
  const posStyle = POSITION_STYLES[pos];
  const NameIcon = getNameIcon(pos);
  const isPodium = pos <= 3;

  const cardBg = isCurrentUser
    ? { backgroundColor: isDark ? 'rgba(30,58,138,0.3)' : colors.blue[50], borderColor: isDark ? colors.blue[700] : colors.blue[400] }
    : isPodium
      ? { backgroundColor: theme.card, borderColor: posStyle?.ringBorder ?? theme.border }
      : { backgroundColor: theme.card, borderColor: theme.border };

  return (
    <View
      style={[
        styles.row,
        cardBg,
        { borderWidth: isCurrentUser || isPodium ? (isCurrentUser ? 1 : 2) : 1 },
      ]}
    >
      {/* Position */}
      <View style={styles.positionWrap}>
        {isPodium ? (
          <View style={[styles.positionBadge, { backgroundColor: posStyle?.badgeBg }]}>
            <Text style={[styles.positionNumber, { color: '#ffffff' }]}>{pos}</Text>
          </View>
        ) : (
          <Text style={[styles.plainPosition, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
            {pos}
          </Text>
        )}
      </View>

      {/* Avatar — position-specific colored initials (matching web) */}
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: isPodium
              ? posStyle?.avatarBg
              : (isDark ? colors.gray[700] : colors.gray[100]),
          },
          isPodium && {
            borderWidth: 2,
            borderColor: posStyle?.avatarRing,
          },
        ]}
      >
        <Text
          style={[
            styles.avatarText,
            {
              color: isPodium
                ? posStyle?.avatarText
                : (isDark ? colors.gray[300] : colors.gray[600]),
            },
          ]}
        >
          {((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')).toUpperCase()}
        </Text>
      </View>

      {/* Name — inline first + last, with position icon for podium */}
      <View style={styles.nameWrap}>
        <View style={styles.nameRow}>
          {NameIcon && (
            <NameIcon
              size={16}
              color={posStyle?.nameIconColor}
            />
          )}
          <Text style={[styles.firstName, { color: theme.foreground }]} numberOfLines={1}>
            {user.first_name}
            {user.last_name ? (
              <Text style={[styles.lastName, { color: theme.mutedForeground }]}>
                {' '}{user.last_name}
              </Text>
            ) : null}
          </Text>
          {isCurrentUser && (
            <Text
              style={[
                styles.youBadge,
                {
                  color: isDark ? colors.blue[300] : colors.blue[600],
                  backgroundColor: isDark ? 'rgba(30,58,138,0.5)' : colors.blue[100],
                },
              ]}
            >
              Você
            </Text>
          )}
        </View>
      </View>

      {/* XP */}
      <View style={styles.xpWrap}>
        <Zap size={14} color={colors.yellow[500]} />
        <Text style={[styles.xpText, { color: isDark ? colors.gray[300] : colors.gray[700] }]}>
          {user.xp.toLocaleString('pt-BR')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 12, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  tabsWrap: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    gap: 2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  tabActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  loader: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  positionWrap: { width: 36, alignItems: 'center' },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionNumber: { fontSize: 12, fontWeight: '900' },
  plainPosition: { fontSize: 14, fontWeight: '700' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  nameWrap: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  firstName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  lastName: { fontWeight: '400' },
  youBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  xpWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  xpText: { fontSize: 14, fontWeight: '700' },
  separatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  separatorLine: {
    flex: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  separatorText: { fontSize: 12, fontWeight: '500' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptyDesc: { fontSize: 14, textAlign: 'center', maxWidth: 260 },
});

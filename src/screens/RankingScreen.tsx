import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Pressable, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Crown, Medal, Zap } from 'lucide-react-native';
import { rankingApi, RankingUser } from '../api/ranking';
import { Avatar } from '../components/ui/Avatar';
import { colors } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';
import type { ThemeTokens } from '../stores/appearanceStore';

type Period = 'daily' | 'weekly' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: '🔥 Hoje' },
  { key: 'weekly', label: '📈 Semana' },
  { key: 'all', label: '🏆 Geral' },
];

const MEDAL_COLORS: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: colors.yellow[500], text: '#fff', ring: colors.yellow[400] },
  2: { bg: colors.blue[500], text: '#fff', ring: colors.blue[200] },
  3: { bg: colors.purple[500], text: '#fff', ring: colors.purple[400] },
};

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Text style={[styles.title, { color: theme.foreground }]}>Ranking</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            style={[
              styles.tab,
              { backgroundColor: isDark ? colors.gray[800] : colors.gray[100] },
              period === p.key && { backgroundColor: isDark ? colors.purple[900] : colors.purple[100] },
            ]}
            onPress={() => setPeriod(p.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: isDark ? colors.gray[400] : colors.gray[500] },
                period === p.key && { color: colors.purple[600] },
              ]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.purple[500]} />
      ) : (
        <FlatList
          data={topUsers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            currentUserData ? (
              <View style={styles.separator}>
                <Text style={[styles.separatorText, { color: isDark ? colors.gray[600] : colors.gray[400] }]}>···</Text>
                <RankingRow user={currentUserData} isCurrentUser highlight isDark={isDark} theme={theme} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <RankingRow user={item} isCurrentUser={item.is_current_user} isDark={isDark} theme={theme} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function RankingRow({ user, isCurrentUser, highlight, isDark, theme }: {
  user: RankingUser;
  isCurrentUser: boolean;
  highlight?: boolean;
  isDark: boolean;
  theme: ThemeTokens;
}) {
  const medalStyle = MEDAL_COLORS[user.position];
  const name = `${user.first_name} ${user.last_name}`.trim();

  return (
    <View style={[
      styles.row,
      { backgroundColor: theme.card, borderColor: theme.border },
      (isCurrentUser || highlight) && {
        backgroundColor: isDark ? colors.blue[900] : colors.blue[50],
        borderColor: isDark ? colors.blue[700] : colors.blue[200],
      },
    ]}>
      {/* Posição */}
      <View style={[styles.positionBadge, medalStyle ? { backgroundColor: medalStyle.bg } : { backgroundColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
        {user.position === 1 ? (
          <Crown size={14} color="#fff" />
        ) : user.position <= 3 ? (
          <Medal size={14} color="#fff" />
        ) : (
          <Text style={[styles.positionText, { color: isDark ? colors.gray[400] : colors.gray[600] }]}>{user.position}</Text>
        )}
      </View>

      {/* Avatar */}
      <Avatar
        name={name}
        size={40}
        style={medalStyle ? { borderWidth: 2, borderColor: medalStyle.ring } : undefined}
      />

      {/* Nome */}
      <View style={styles.nameWrap}>
        <Text style={[styles.firstName, { color: theme.foreground }]}>{user.first_name}</Text>
        <Text style={[styles.lastName, { color: theme.mutedForeground }]} numberOfLines={1}>{user.last_name}</Text>
        {isCurrentUser && (
          <Text style={[
            styles.youBadge,
            { color: isDark ? colors.blue[300] : colors.blue[600], backgroundColor: isDark ? colors.blue[900] : colors.blue[100] },
          ]}>
            Você
          </Text>
        )}
      </View>

      {/* XP */}
      <View style={styles.xpWrap}>
        <Zap size={14} color={colors.yellow[500]} />
        <Text style={[styles.xpText, { color: theme.foreground }]}>{user.xp.toLocaleString('pt-BR')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', padding: 16 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    alignItems: 'center',
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  loader: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  positionBadge: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  positionText: { fontSize: 12, fontWeight: '700' },
  nameWrap: { flex: 1, gap: 1 },
  firstName: { fontSize: 14, fontWeight: '700' },
  lastName: { fontSize: 12 },
  youBadge: {
    fontSize: 10, fontWeight: '700',
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 4, alignSelf: 'flex-start',
  },
  xpWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  xpText: { fontSize: 14, fontWeight: '700' },
  separator: { gap: 4, marginTop: 8 },
  separatorText: { textAlign: 'center', fontSize: 18, letterSpacing: 4 },
});

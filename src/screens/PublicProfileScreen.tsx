import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { ChevronLeft, Flame, Pencil } from 'lucide-react-native';
import { profileApi } from '../api/profile';
import { Avatar } from '../components/ui/Avatar';
import { StarBadge, StarRow } from '../components/ui/StarBadge';
import { GameButton } from '../components/ui/GameButton';
import { colors } from '../theme/colors';
import { useAppearance } from '../hooks/useAppearance';

type Params = { PublicProfile: { uuid: string } };

/**
 * Perfil público, aberto pelo ranking (ou pelo próprio Perfil): avatar, nome, ofensiva,
 * descrição e as conquistas com estrela que a pessoa não escondeu. Igual à página
 * /perfil/{uuid} da web.
 */
export function PublicProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'PublicProfile'>>();
  const { isDark, theme } = useAppearance();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-profile', route.params.uuid],
    queryFn: async () => (await profileApi.publicProfile(route.params.uuid)).data,
  });

  const muted = isDark ? colors.gray[400] : colors.gray[500];
  const strong = isDark ? '#fff' : colors.gray[900];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Voltar">
          <ChevronLeft size={26} color={isDark ? colors.gray[300] : colors.gray[600]} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.purple[500]} size="large" />
        </View>
      ) : isError || !data ? (
        <View style={styles.center}>
          <Text style={[styles.message, { color: muted }]}>Não foi possível abrir este perfil.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Avatar
              config={data.profile.avatar_config}
              name={`${data.profile.first_name} ${data.profile.last_name}`}
              size={112}
            />
            <Text style={[styles.name, { color: strong }]}>
              {`${data.profile.first_name} ${data.profile.last_name}`.trim()}
            </Text>
            <View style={styles.streakRow}>
              <Flame size={16} color={data.profile.streak > 0 ? colors.orange[500] : muted} />
              <Text style={[styles.streak, { color: data.profile.streak > 0 ? colors.orange[500] : muted }]}>
                {data.profile.streak === 0
                  ? 'Sem ofensiva no momento'
                  : `${data.profile.streak} ${data.profile.streak === 1 ? 'dia' : 'dias'} de ofensiva`}
              </Text>
            </View>
            {data.profile.bio ? (
              <Text style={[styles.bio, { color: isDark ? colors.gray[300] : colors.gray[600] }]}>{data.profile.bio}</Text>
            ) : data.profile.is_self ? (
              <Text style={[styles.bio, { color: muted }]}>Escreva uma descrição para quem visitar seu perfil.</Text>
            ) : null}
            {data.profile.is_self ? (
              <GameButton
                variant="white"
                size="sm"
                isDark={isDark}
                // Vale aberto pelo ranking ou pelo Perfil: vai para a aba Perfil
                onPress={() => navigation.getParent()?.navigate('Perfil', { screen: 'ProfileMain' })}
                style={{ marginTop: 16 }}
              >
                <Pencil size={14} color={isDark ? colors.gray[200] : colors.gray[800]} />
                <Text style={{ fontWeight: '700', color: isDark ? colors.gray[200] : colors.gray[800] }}> Editar perfil</Text>
              </GameButton>
            ) : null}
          </View>

          <Text style={[styles.sectionLabel, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>CONQUISTAS</Text>
          {data.achievements.length > 0 ? (
            <View style={styles.grid}>
              {data.achievements.map((achievement) => (
                <View
                  key={achievement.uuid}
                  style={[styles.card, { backgroundColor: theme.card, borderColor: isDark ? colors.gray[800] : colors.gray[200] }]}
                >
                  <StarBadge
                    badgeUrl={achievement.badge_url}
                    name={achievement.name}
                    stars={achievement.stars}
                    icon={achievement.icon}
                    color={achievement.color}
                    size={112}
                  />
                  <Text style={[styles.cardName, { color: strong }]} numberOfLines={2}>
                    {achievement.name}
                  </Text>
                  <View style={{ marginTop: 6 }}>
                    <StarRow stars={achievement.stars} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.empty, { borderColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
              <Text style={[styles.message, { color: muted }]}>Nenhuma conquista para mostrar</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 12, paddingVertical: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { fontSize: 14, textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 24 },
  name: { marginTop: 16, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  streakRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  streak: { fontSize: 14, fontWeight: '700' },
  bio: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 360 },
  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12, paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47.5%', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 16 },
  cardName: { marginTop: 12, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 32 },
});

import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { DisciplineBadge } from './DisciplineBadge';
import { colors } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';

/**
 * Badge da conquista com estrelas, como o `StarBadge.vue` da web: a arte da disciplina para o
 * número de estrelas (`badge_url`, 0 = bloqueado) ou, sem arte nova, o badge antigo.
 */
export function StarBadge({
  badgeUrl,
  name,
  stars,
  icon,
  color,
  size = 120,
}: {
  badgeUrl?: string | null;
  name: string;
  stars: number;
  icon: string;
  color: string;
  size?: number;
}) {
  const { isDark } = useAppearance();
  const label = stars === 0 ? `${name}, conquista bloqueada` : `${name}, ${stars} ${stars === 1 ? 'estrela' : 'estrelas'}`;

  if (badgeUrl) {
    return (
      <Image
        source={{ uri: badgeUrl }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel={label}
      />
    );
  }

  return (
    <View accessibilityLabel={label}>
      <DisciplineBadge icon={icon} color={color} level={Math.max(1, stars)} locked={stars === 0} isDark={isDark} />
    </View>
  );
}

/** As 5 estrelas, acesas até `stars`. */
export function StarRow({ stars, size = 16 }: { stars: number; size?: number }) {
  const { isDark } = useAppearance();

  return (
    <View style={styles.row} accessibilityLabel={`${stars} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((position) => {
        const lit = position <= stars;
        const fill = lit ? colors.amber[400] : isDark ? colors.gray[700] : colors.gray[200];
        return <Star key={position} size={size} color={fill} fill={fill} strokeWidth={0} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2, alignItems: 'center' },
});

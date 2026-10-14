import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { buildAvatarSvg, hasAvatar, type AvatarConfig } from '../../lib/avatar';
import { colors } from '../../theme/colors';

type Props = {
  name?: string;
  // `avatar_config` da API. Nulo para quem nunca montou o avatar: cai nas iniciais.
  config?: Partial<AvatarConfig> | null;
  size?: number;
  style?: ViewStyle;
  // Cores das iniciais — o ranking pinta cada posição do pódio de um jeito.
  fallbackColors?: { background: string; text: string };
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

export function Avatar({ name, config, size = 40, style, fallbackColors }: Props) {
  const initials = name ? getInitials(name) : '?';
  const fontSize = Math.round(size * 0.35);
  const drawn = hasAvatar(config);

  // O mesmo SVG da web. O fundo sangra o quadrado inteiro e o círculo é o
  // recorte deste container.
  const xml = useMemo(() => (drawn ? buildAvatarSvg(config) : null), [drawn, config]);

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        fallbackColors && !drawn && { backgroundColor: fallbackColors.background },
        style,
      ]}
    >
      {xml ? (
        <SvgXml xml={xml} width={size} height={size} />
      ) : (
        <Text style={[styles.initials, { fontSize }, fallbackColors && { color: fallbackColors.text }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: colors.gray[700],
    fontWeight: '700',
  },
});

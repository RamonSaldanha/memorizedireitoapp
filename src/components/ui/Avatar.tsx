import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  name?: string;
  uri?: string;
  size?: number;
  style?: ViewStyle;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

export function Avatar({ name, uri, size = 40, style }: Props) {
  const initials = name ? getInitials(name) : '?';
  const fontSize = Math.round(size * 0.35);

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
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

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'purple';

function getVariants(isDark: boolean): Record<Variant, { bg: string; text: string; border: string }> {
  return {
    default: { bg: colors.primary, text: colors.primaryForeground, border: 'transparent' },
    secondary: {
      bg: isDark ? colors.gray[800] : colors.gray[100],
      text: isDark ? colors.gray[300] : colors.gray[700],
      border: 'transparent',
    },
    destructive: { bg: colors.red[500], text: '#fff', border: 'transparent' },
    outline: {
      bg: 'transparent',
      text: isDark ? colors.gray[100] : colors.foreground,
      border: isDark ? colors.gray[700] : colors.border,
    },
    success: {
      bg: isDark ? colors.green[900] : colors.green[100],
      text: isDark ? colors.green[300] : colors.green[700],
      border: 'transparent',
    },
    purple: {
      bg: isDark ? colors.purple[900] : colors.purple[100],
      text: isDark ? colors.purple[300] : colors.purple[700],
      border: 'transparent',
    },
  };
}

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  style?: ViewStyle;
  isDark?: boolean;
};

export function Badge({ children, variant = 'default', style, isDark = false }: Props) {
  const v = getVariants(isDark)[variant];

  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={[styles.text, { color: v.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});

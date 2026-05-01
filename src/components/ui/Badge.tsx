import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'purple';

const VARIANTS: Record<Variant, { bg: string; text: string; border: string }> = {
  default: { bg: colors.primary, text: colors.primaryForeground, border: 'transparent' },
  secondary: { bg: colors.gray[100], text: colors.gray[700], border: 'transparent' },
  destructive: { bg: colors.red[500], text: '#fff', border: 'transparent' },
  outline: { bg: 'transparent', text: colors.foreground, border: colors.border },
  success: { bg: colors.green[100], text: colors.green[700], border: 'transparent' },
  purple: { bg: colors.purple[100], text: colors.purple[700], border: 'transparent' },
};

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  style?: ViewStyle;
};

export function Badge({ children, variant = 'default', style }: Props) {
  const v = VARIANTS[variant];

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

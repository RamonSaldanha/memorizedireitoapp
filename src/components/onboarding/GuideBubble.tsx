import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { DEMO_AVATARS } from '../../lib/onboarding/demoAvatars';
import { Bubble } from './motion';
import type { ObTheme } from './palette';

type Props = {
  title: string;
  subtitle?: string;
  theme: ObTheme;
  reduce: boolean;
};

/** O guia (avatar "Você") falando num balão, no topo das perguntas, da trilha e do desafio. */
export function GuideBubble({ title, subtitle, theme, reduce }: Props) {
  return (
    <View style={styles.row}>
      <Avatar config={DEMO_AVATARS['Você']} name="Guia" size={56} />
      <Bubble reduce={reduce} style={[styles.bubble, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
      </Bubble>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 24,
  },
  bubble: {
    flexShrink: 1,
    borderWidth: 2,
    borderRadius: 16,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
  },
});

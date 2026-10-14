import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Flame, Gift, ListChecks, Zap } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Avatar } from '../ui/Avatar';
import { DEMO_AVATARS } from '../../lib/onboarding/demoAvatars';
import { ChunkyView } from './ChunkyPressable';
import { Bob, Float, Rise } from './motion';
import { tint, tw, type ObTheme } from './palette';

type Props = {
  firstName: string;
  isDark: boolean;
  theme: ObTheme;
  reduce: boolean;
};

const ITEMS = [
  { icon: ListChecks, text: 'Conte seu objetivo', tint: 'blue' },
  { icon: Zap, text: 'Jogue seu primeiro desafio', tint: 'green' },
  { icon: Gift, text: 'Ganhe um presente no final', tint: 'pink' },
] as const;

/** 1. Boas-vindas: o guia, as duas recompensas flutuando e o que vem pela frente. */
export function WelcomeStep({ firstName, isDark, theme, reduce }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.hero}>
        <Bob reduce={reduce}>
          <View style={[styles.ring, { backgroundColor: isDark ? colors.gray[800] : colors.gray[50] }]}>
            <Avatar config={DEMO_AVATARS['Você']} name="Guia" size={144} />
          </View>
        </Bob>
        <Float reduce={reduce} delay={500} style={styles.xpPill}>
          <ChunkyView
            radius={999}
            shadowColor={isDark ? tw.shadowDark : tw.purple200}
            style={[
              styles.pill,
              { borderColor: isDark ? tw.purple900 : tw.purple200, backgroundColor: isDark ? colors.gray[800] : '#fff' },
            ]}
          >
            <Text style={[styles.pillText, { color: isDark ? tw.purple300 : tw.purple600 }]}>+25 XP</Text>
          </ChunkyView>
        </Float>
        <Float reduce={reduce} delay={750} style={styles.streakPill}>
          <ChunkyView
            radius={999}
            shadowColor={isDark ? tw.shadowDark : tw.orange200}
            style={[
              styles.pill,
              { borderColor: isDark ? tw.orange900 : tw.orange200, backgroundColor: isDark ? colors.gray[800] : '#fff' },
            ]}
          >
            <Flame size={16} color={tw.orange500} fill={tw.orange500} />
            <Text style={[styles.pillText, { color: tw.orange500 }]}>1 dia</Text>
          </ChunkyView>
        </Float>
      </View>

      <Rise index={1} reduce={reduce}>
        <Text style={[styles.title, { color: theme.text }]}>Oi, {firstName}! Vamos montar sua trilha.</Text>
      </Rise>
      <Rise index={2} reduce={reduce}>
        <Text style={[styles.lead, { color: theme.muted }]}>
          Três perguntas rápidas, um desafio de 30 segundos e você já sai jogando.
        </Text>
      </Rise>

      <View style={styles.list}>
        {ITEMS.map((item, i) => {
          const t = tint(item.tint, isDark);
          const Icon = item.icon;
          return (
            <Rise key={item.text} index={i + 3} reduce={reduce}>
              <View style={[styles.item, { borderColor: theme.hairline }]}>
                <View style={[styles.itemIcon, { backgroundColor: t.bg }]}>
                  <Icon size={20} color={t.fg} />
                </View>
                <Text style={[styles.itemText, { color: theme.text }]}>{item.text}</Text>
              </View>
            </Rise>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  hero: {
    width: 144,
    height: 144,
    marginBottom: 32,
  },
  // `ring-8 ring-gray-50`: o anel fica por fora dos 144px, sem ocupar espaço.
  ring: {
    margin: -8,
    padding: 8,
    borderRadius: 80,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  xpPill: {
    position: 'absolute',
    right: -56,
    top: 12,
  },
  streakPill: {
    position: 'absolute',
    left: -56,
    bottom: 16,
  },
  pillText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.75,
    textAlign: 'center',
  },
  lead: {
    marginTop: 12,
    maxWidth: 384,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  list: {
    marginTop: 32,
    width: '100%',
    maxWidth: 384,
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
});

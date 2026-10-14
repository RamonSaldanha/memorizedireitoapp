import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { ChunkyPressable } from './ChunkyPressable';
import { CheckPop, Rise, usePicked } from './motion';
import { QUIZ_ICONS } from './icons';
import { tint, tw, type ObTheme } from './palette';

type Props = {
  title: string;
  caption: string;
  icon: string;
  tintName: string;
  /** Intensidade do tempo de estudo (1 a 4), só na pergunta dos minutos. */
  bars?: number;
  selected: boolean;
  index: number;
  onPress: () => void;
  isDark: boolean;
  theme: ObTheme;
  reduce: boolean;
};

/** Uma alternativa do quiz (objetivo, área ou minutos por dia). */
export function QuizOption({ title, caption, icon, tintName, bars, selected, index, onPress, isDark, theme, reduce }: Props) {
  const picked = usePicked(selected, reduce);
  const Icon = QUIZ_ICONS[icon] ?? QUIZ_ICONS.Sparkles;
  const iconTint = tint(tintName, isDark);

  const face = selected
    ? {
        borderColor: isDark ? tw.blue500 : tw.blue400,
        backgroundColor: isDark ? tw.blue950_40 : tw.blue50,
        shadow: isDark ? tw.blue900 : tw.blue300,
      }
    : { borderColor: theme.border, backgroundColor: theme.card, shadow: theme.shadow };

  return (
    <Rise index={index} reduce={reduce}>
      <Animated.View style={{ transform: [{ scale: picked }] }}>
        <ChunkyPressable
          onPress={onPress}
          radius={16}
          shadowColor={face.shadow}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected }}
          style={[styles.face, { borderColor: face.borderColor, backgroundColor: face.backgroundColor }]}
        >
          <View style={[styles.iconBox, { backgroundColor: iconTint.bg }]}>
            <Icon size={24} color={iconTint.fg} />
          </View>
          <View style={styles.texts}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.caption, { color: theme.muted }]}>{caption}</Text>
          </View>
          {bars ? (
            <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {[1, 2, 3, 4].map((b) => (
                <View
                  key={b}
                  style={[
                    styles.bar,
                    {
                      height: b * 6,
                      backgroundColor: b <= bars ? tw.orange400 : isDark ? colors.gray[700] : colors.gray[200],
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
          {selected ? (
            <CheckPop reduce={reduce} style={styles.check}>
              <Check size={16} color="#fff" strokeWidth={3} />
            </CheckPop>
          ) : null}
        </ChunkyPressable>
      </Animated.View>
    </Rise>
  );
}

const styles = StyleSheet.create({
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  bars: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  bar: {
    width: 6,
    borderRadius: 999,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tw.blue500,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React, { useRef } from 'react';
import { Animated, Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';

/**
 * A palavra com a mesma cara no banco e na lacuna, como na web (`.word-chip`): um botão na
 * medida do texto da lei, com borda fina e a borda de baixo "3D", que afunda ao toque. Na
 * lacuna a letra fica a 85% do texto para caber na linha.
 */
export function WordChip({
  word,
  onPress,
  inGap = false,
  accessibilityLabel,
  style,
}: {
  word: string;
  onPress: () => void;
  inGap?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark } = useAppearance();
  const sink = useRef(new Animated.Value(0)).current;
  const edge = isDark ? colors.gray[600] : colors.gray[300];

  const press = (to: number) => Animated.timing(sink, { toValue: to, duration: 90, useNativeDriver: true }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => press(3)}
      onPressOut={() => press(0)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? word}
      hitSlop={inGap ? 4 : 0}
      style={[{ paddingBottom: 3 }, inGap && styles.gapWrap, style]}
    >
      {/* A borda de baixo fica parada; a face desce sobre ela */}
      <Animated.View style={[styles.edge, { backgroundColor: edge, borderRadius: 8 }]} />
      <Animated.View
        style={[
          styles.face,
          inGap ? styles.faceGap : styles.faceBank,
          {
            backgroundColor: isDark ? colors.gray[700] : '#ffffff',
            borderColor: edge,
            transform: [{ translateY: sink }],
          },
        ]}
      >
        <Text style={[inGap ? styles.textGap : styles.textBank, { color: isDark ? '#ffffff' : colors.gray[900] }]}>{word}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** O lugar vazio que a palavra usada deixa no banco, na medida dela. */
export function EmptyWordSlot({ word }: { word: string }) {
  const { isDark } = useAppearance();

  return (
    <Animated.View style={[styles.empty, { backgroundColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
      <Text style={[styles.textBank, { opacity: 0 }]}>{word}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gapWrap: { marginHorizontal: 2, alignSelf: 'center' },
  edge: { position: 'absolute', left: 0, right: 0, top: 3, bottom: 0 },
  face: { borderWidth: 2, borderRadius: 8 },
  faceBank: { paddingHorizontal: 10, paddingVertical: 3 },
  faceGap: { paddingHorizontal: 7 },
  textBank: { fontSize: 17, lineHeight: 23, fontWeight: '700' },
  textGap: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  empty: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 3 },
});

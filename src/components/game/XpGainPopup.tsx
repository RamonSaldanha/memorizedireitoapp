import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  amount: number | null;
  onDone?: () => void;
};

export function XpGainPopup({ amount, onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (amount == null || amount <= 0) return;

    opacity.setValue(0);
    translateY.setValue(20);
    scale.setValue(0.8);

    Animated.sequence([
      // 0 → 30%: opacity 0→1, translateY 20→-10, scale 0.8→1.2
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -10, duration: 600, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.2, duration: 600, useNativeDriver: true }),
      ]),
      // 30 → 70%: opacity 1, translateY -10→-20, scale 1.2→1
      Animated.parallel([
        Animated.timing(translateY, { toValue: -20, duration: 800, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      // 70 → 100%: opacity 1→0, translateY -20→-40, scale 1→0.8
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -40, duration: 600, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.8, duration: 600, useNativeDriver: true }),
      ]),
    ]).start(() => {
      onDone?.();
    });
  }, [amount]);

  if (amount == null || amount <= 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <Text style={styles.text}>+{amount} XP</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: colors.purple[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
});

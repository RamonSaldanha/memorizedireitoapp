import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gift } from 'lucide-react-native';
import { ChunkyView } from './ChunkyPressable';
import { OnboardingCta } from './OnboardingCta';
import { tw, type ObTheme } from './palette';

type Props = {
  visible: boolean;
  skipping: boolean;
  onClose: () => void;
  onSkip: () => void;
  isDark: boolean;
  theme: ObTheme;
  reduce: boolean;
};

const SHEET_EASE = Easing.bezier(0.34, 1.4, 0.64, 1);

/**
 * Aviso ao pular (`ob-modal` da web): o fundo escurece e a folha sobe de baixo.
 * Fica montado até a animação de saída terminar.
 */
export function SkipSheet({ visible, skipping, onClose, onSkip, isDark, theme, reduce }: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setMounted(true);
    if (reduce) {
      t.setValue(visible ? 1 : 0);
      if (!visible) setMounted(false);
      return;
    }
    Animated.timing(t, {
      toValue: visible ? 1 : 0,
      duration: visible ? 300 : 200,
      easing: visible ? SHEET_EASE : Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, reduce]);

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar aviso" />
      </Animated.View>
      <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 16) }]} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheetWrap,
            {
              transform: [
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
              ],
            },
          ]}
        >
          <ChunkyView
            radius={24}
            depth={8}
            shadowColor={theme.shadow}
            style={[styles.sheet, { borderColor: theme.border, backgroundColor: theme.card }]}
          >
            <View style={[styles.gift, { backgroundColor: isDark ? tw.pink950_60 : tw.pink100 }]}>
              <Gift size={28} color={isDark ? tw.pink300 : tw.pink500} />
            </View>
            <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
              Tem certeza que quer pular?
            </Text>
            <Text style={[styles.text, { color: theme.muted }]}>
              Se pular agora, você pode perder a oferta especial de boas-vindas e o estudo personalizado para o seu objetivo.
            </Text>
            <View style={styles.actions}>
              <OnboardingCta onPress={onClose} isDark={isDark} reduce={reduce}>
                Continuar personalizando
              </OnboardingCta>
              <Pressable onPress={onSkip} disabled={skipping} style={[styles.skip, skipping && { opacity: 0.6 }]}>
                {({ pressed }) => (
                  <View style={styles.skipRow}>
                    {skipping && <ActivityIndicator size="small" color={theme.muted} />}
                    <Text style={[styles.skipText, { color: pressed ? tw.red500 : theme.muted }]}>Pular mesmo assim</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </ChunkyView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23,23,23,0.5)', // gray-900/50
  },
  wrap: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 384,
  },
  sheet: {
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
  },
  gift: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  text: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    marginTop: 24,
    alignSelf: 'stretch',
    gap: 8,
  },
  skip: {
    borderRadius: 12,
    paddingVertical: 8,
  },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  skipText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});

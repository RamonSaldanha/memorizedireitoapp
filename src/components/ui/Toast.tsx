import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { Check, X, Info } from 'lucide-react-native';
import { useAppearance } from '../../hooks/useAppearance';

type Variant = 'success' | 'error' | 'default';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  variant?: Variant;
  onHide: () => void;
  duration?: number;
};

/**
 * Notificação no topo, com o desenho do aviso da família (o Notice do site): chapada, fundo no
 * tom 100 (950 no escuro), contorno no 200 (900), círculo no 500 com ícone branco, título no
 * 700 (300) e texto no 800 (200). Sem sombra difusa: aviso não é botão.
 */
const TONES = {
  success: {
    Icon: Check,
    light: { bg: '#dcfce7', line: '#bbf7d0', dot: '#22c55e', title: '#15803d', text: '#166534' },
    dark: { bg: '#052e16', line: '#14532d', dot: '#22c55e', title: '#86efac', text: '#bbf7d0' },
  },
  error: {
    Icon: X,
    light: { bg: '#fee2e2', line: '#fecaca', dot: '#ef4444', title: '#b91c1c', text: '#991b1b' },
    dark: { bg: '#450a0a', line: '#7f1d1d', dot: '#ef4444', title: '#fca5a5', text: '#fecaca' },
  },
  default: {
    Icon: Info,
    light: { bg: '#dbeafe', line: '#bfdbfe', dot: '#3b82f6', title: '#1d4ed8', text: '#1e40af' },
    dark: { bg: '#172554', line: '#1e3a8a', dot: '#3b82f6', title: '#93c5fd', text: '#bfdbfe' },
  },
} as const;

export function Toast({ visible, title, message, variant = 'default', onHide, duration = 2200 }: Props) {
  const { isDark } = useAppearance();

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onHide, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onHide]);

  const tone = TONES[variant];
  const c = isDark ? tone.dark : tone.light;
  const Icon = tone.Icon;

  return (
    <Modal
      isVisible={visible}
      animationIn="slideInDown"
      animationOut="slideOutUp"
      animationInTiming={250}
      animationOutTiming={250}
      backdropOpacity={0}
      hasBackdrop={false}
      coverScreen={false}
      style={styles.modal}
      pointerEvents="none"
    >
      <View style={[styles.toast, { backgroundColor: c.bg, borderColor: c.line }]} pointerEvents="none">
        <View style={[styles.dot, { backgroundColor: c.dot }]}>
          <Icon size={16} color="#fff" strokeWidth={3} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: c.title }]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, { color: c.text }]} numberOfLines={2}>
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  toast: {
    marginTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    minWidth: 280,
    maxWidth: '90%',
    gap: 12,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2,
  },
});

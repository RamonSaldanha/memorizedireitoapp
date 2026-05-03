import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { CheckCircle, AlertCircle, Info } from 'lucide-react-native';
import { colors } from '../../theme/colors';

type Variant = 'success' | 'error' | 'default';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  variant?: Variant;
  onHide: () => void;
  duration?: number;
};

const VARIANTS = {
  success: {
    bg: colors.green[500],
    Icon: CheckCircle,
  },
  error: {
    bg: colors.red[500],
    Icon: AlertCircle,
  },
  default: {
    bg: colors.gray[800],
    Icon: Info,
  },
} as const;

export function Toast({ visible, title, message, variant = 'default', onHide, duration = 2200 }: Props) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onHide, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onHide]);

  const { bg, Icon } = VARIANTS[variant];

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
      <View style={[styles.toast, { backgroundColor: bg }]} pointerEvents="none">
        <View style={styles.iconWrap}>
          <Icon size={20} color="#fff" strokeWidth={2.5} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          {message ? (
            <Text style={styles.message} numberOfLines={2}>{message}</Text>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    minWidth: 280,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  message: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
    marginTop: 2,
  },
});

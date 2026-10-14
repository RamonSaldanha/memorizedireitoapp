import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Lock } from 'lucide-react-native';
import { buildAvatarSvg, type AvatarConfig, type AvatarCrop } from '../../lib/avatar';
import { useAppearance } from '../../hooks/useAppearance';
import { colors } from '../../theme/colors';

type Props = {
  // Config completo já com a opção desta peça aplicada (`previewWith` da lib).
  preview: AvatarConfig;
  label: string;
  selected: boolean;
  // Recorte do viewBox: rosto para peças da cabeça, avatar inteiro para corpo e cabelo.
  crop: AvatarCrop;
  // Sufixo fixo dos ids internos do SVG (o recorte do visor). Com ele, o
  // desenho de uma opção que não mudou sai idêntico e não é reprocessado.
  uid: string;
  width: number;
  // Exclusiva de assinante vista por quem não assina. Continua clicável: o
  // toque é o que abre o convite para assinar.
  locked?: boolean;
  onPress: () => void;
};

/** Miniatura de uma opção de peça no editor, porte do `OptionTile.vue` da web. */
export function OptionTile({ preview, label, selected, crop, uid, width, locked = false, onPress }: Props) {
  const { isDark } = useAppearance();
  const xml = useMemo(() => buildAvatarSvg(preview, { uid, crop, background: false }), [preview, uid, crop]);

  // A borda (2) e o respiro (8) dos dois lados saem da largura da miniatura.
  const artWidth = width - 20;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={locked ? `${label}, exclusiva para assinantes` : label}
      style={[
        styles.tile,
        { width },
        selected
          ? { borderColor: isDark ? colors.purple[400] : colors.purple[500], backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : colors.purple[50] }
          : { borderColor: isDark ? colors.gray[700] : colors.gray[200] },
      ]}
    >
      <View
        style={[
          styles.art,
          { width: artWidth, height: (artWidth * crop[3]) / crop[2], backgroundColor: isDark ? colors.gray[800] : colors.gray[100] },
        ]}
      >
        <SvgXml xml={xml} width="100%" height="100%" />
        {locked && (
          <View style={styles.lock}>
            <Lock size={14} color="#ffffff" />
          </View>
        )}
      </View>

      <Text
        style={[
          styles.label,
          { color: selected ? (isDark ? colors.purple[300] : colors.purple[600]) : isDark ? colors.gray[400] : colors.gray[500] },
        ]}
      >
        {label}
      </Text>
      {locked && <Text style={[styles.premium, { color: isDark ? colors.amber[400] : colors.amber[600] }]}>Assinantes</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderRadius: 16,
    padding: 8,
  },
  art: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  lock: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(23,23,23,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  premium: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

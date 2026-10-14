import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useAppearance } from '../../hooks/useAppearance';
import { colors } from '../../theme/colors';

type Props = {
  colors: string[];
  value: string;
  label: string;
  onChange: (color: string) => void;
};

/** Paleta de um grupo de cor do editor, porte do `ColorSwatches.vue` da web. */
export function ColorSwatches({ colors: palette, value, label, onChange }: Props) {
  const { isDark } = useAppearance();

  return (
    <View style={styles.row}>
      {palette.map((color) => {
        const selected = value === color;

        return (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${color}`}
            accessibilityState={{ selected }}
            style={[
              styles.swatch,
              selected
                ? { borderColor: isDark ? colors.purple[400] : colors.purple[500], backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : colors.purple[50] }
                : { borderColor: isDark ? colors.gray[700] : colors.gray[200] },
            ]}
          >
            <View style={[styles.color, { backgroundColor: color }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  color: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
});

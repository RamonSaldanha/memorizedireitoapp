import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
};

export function Input({ label, error, containerStyle, style, ...props }: Props) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={colors.mutedForeground}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: 2,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.background,
  },
  inputError: {
    borderColor: colors.red[500],
  },
  error: {
    fontSize: 11,
    color: colors.red[500],
  },
});

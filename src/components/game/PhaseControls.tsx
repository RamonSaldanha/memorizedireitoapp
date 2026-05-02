import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw } from 'lucide-react-native';
import { GameButton } from '../ui/GameButton';
import { colors } from '../../theme/colors';

type Props = {
  options: string[];
  hasLacunas: boolean;
  allFilled: boolean;
  verified: boolean;
  isSubmitting: boolean;
  isLastSegment: boolean;
  onSelect: (word: string) => void;
  onClear: () => void;
  onVerify: () => void;
  onNext: () => void;
};

export function PhaseControls({
  options,
  hasLacunas,
  allFilled,
  verified,
  isSubmitting,
  isLastSegment,
  onSelect,
  onClear,
  onVerify,
  onNext,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8) + 8;

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]}>
      {!verified ? (
        <>
          {hasLacunas && options.length > 0 && (
            <View style={styles.pillsRow}>
              {options.map((word, idx) => (
                <GameButton
                  key={`${word}-${idx}`}
                  variant="white"
                  size="sm"
                  onPress={() => onSelect(word)}
                >
                  {word}
                </GameButton>
              ))}
            </View>
          )}

          <View style={styles.actionsRow}>
            {hasLacunas ? (
              <GameButton variant="white" size="sm" onPress={onClear}>
                <RefreshCw size={14} color={colors.gray[800]} />
                <Text style={styles.btnInline}>Limpar</Text>
              </GameButton>
            ) : (
              <View />
            )}
            <GameButton
              variant="purple"
              size="sm"
              onPress={onVerify}
              disabled={!allFilled || isSubmitting}
            >
              {isSubmitting ? 'Verificando...' : 'Verificar'}
            </GameButton>
          </View>
        </>
      ) : (
        <View style={styles.actionsRow}>
          <View />
          <GameButton variant="blue" size="md" onPress={onNext}>
            {isLastSegment ? 'Concluir' : 'Próximo →'}
          </GameButton>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  btnInline: {
    color: colors.gray[800],
    fontWeight: '700',
    fontSize: 13,
  },
});

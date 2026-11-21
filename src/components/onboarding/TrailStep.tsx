import React from 'react';
import { LayoutAnimation, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, familyTokens } from '../../theme/colors';
import { choiceLook } from '../ui/ChoiceCard';
import type { LegislationOption } from '../../lib/onboarding/quiz';
import { ChunkyPressable } from './ChunkyPressable';
import { GuideBubble } from './GuideBubble';
import { GameButton } from '../ui/GameButton';
import { Drop } from './motion';
import { tw, type ObTheme } from './palette';

type Props = {
  trailLaws: LegislationOption[];
  otherLaws: LegislationOption[];
  showAllLaws: boolean;
  onShowAllLaws: () => void;
  onToggleLaw: (id: number) => void;
  isDark: boolean;
  theme: ObTheme;
  reduce: boolean;
};

/** `ob-law` do TransitionGroup: quem sai encolhe e some, e o resto escorrega para o lugar. */
function animateLawChange(reduce: boolean) {
  if (reduce) return;
  LayoutAnimation.configureNext({
    duration: 350,
    update: { type: LayoutAnimation.Types.spring, springDamping: 0.75 },
    delete: { type: LayoutAnimation.Types.easeOut, property: LayoutAnimation.Properties.scaleXY },
  });
}

/** 5. A trilha sugerida pelas respostas, que dá para ajustar tocando. */
export function TrailStep({ trailLaws, otherLaws, showAllLaws, onShowAllLaws, onToggleLaw, isDark, theme, reduce }: Props) {
  // Leis escolhidas: o azul do cartão de escolha, como na web
  const chosen = choiceLook('selected', familyTokens(isDark));
  const toggle = (id: number) => {
    animateLawChange(reduce);
    onToggleLaw(id);
  };

  return (
    <View style={styles.section}>
      <GuideBubble
        title={`Pronto! Sua trilha tem ${trailLaws.length} ${trailLaws.length === 1 ? 'lei' : 'leis'}.`}
        subtitle="Toque para tirar ou incluir. Dá para mudar depois no mapa."
        theme={theme}
        reduce={reduce}
      />

      <View style={styles.list}>
        {trailLaws.map((law, i) => (
          <Drop key={law.id} index={i} reduce={reduce}>
            <ChunkyPressable
              onPress={() => toggle(law.id)}
              radius={16}
              shadowColor={chosen.line}
              accessibilityLabel={`Tirar ${law.title} da trilha`}
              style={[styles.law, { borderColor: chosen.line, backgroundColor: chosen.bg }]}
            >
              <View style={[styles.number, { backgroundColor: chosen.key }]}>
                <Text style={[styles.numberText, isDark && { color: colors.gray[900] }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.lawTitle, { color: theme.text }]}>{law.title}</Text>
              <Check size={20} color={chosen.key} strokeWidth={3} />
            </ChunkyPressable>
          </Drop>
        ))}
      </View>

      {!trailLaws.length && (
        <View style={[styles.empty, { borderColor: theme.border }]}>
          <Text style={[styles.emptyText, { color: theme.muted }]}>Escolha pelo menos uma lei para montar a trilha.</Text>
        </View>
      )}

      {otherLaws.length > 0 && (
        <View style={styles.others}>
          {!showAllLaws && trailLaws.length ? (
            <GameButton
              variant="dashed"
              size="md"
              fullWidth
              onPress={() => {
                animateLawChange(reduce);
                onShowAllLaws();
              }}
            >
              {`Incluir outras leis (${otherLaws.length})`}
            </GameButton>
          ) : (
            <View style={styles.chips}>
              {otherLaws.map((law) => (
                <ChunkyPressable
                  key={law.id}
                  onPress={() => toggle(law.id)}
                  radius={12}
                  depth={3}
                  shadowColor={theme.shadow}
                  style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.card }]}
                >
                  <Text style={[styles.chipText, { color: isDark ? colors.gray[300] : colors.gray[600] }]}>+ {law.title}</Text>
                </ChunkyPressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 16,
  },
  list: {
    gap: 12,
  },
  law: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  number: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  lawTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  empty: {
    marginTop: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  others: {
    marginTop: 24,
  },
  more: {
    width: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  moreText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});

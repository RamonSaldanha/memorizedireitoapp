import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import type { ArticleOption } from '../../api/play';

type Props = {
  content: string;
  options: ArticleOption[];
  answers: string[];
  onAnswer: (slotIndex: number, word: string) => void;
};

type Segment = { type: 'text'; value: string } | { type: 'slot'; index: number };

function parseContent(content: string): Segment[] {
  const segments: Segment[] = [];
  const parts = content.split('____');
  parts.forEach((part, i) => {
    if (part) segments.push({ type: 'text', value: part });
    if (i < parts.length - 1) segments.push({ type: 'slot', index: i });
  });
  return segments;
}

export function PracticeContent({ content, options, answers, onAnswer }: Props) {
  const segments = parseContent(content);
  const correctOptions = options.filter((o) => o.is_correct).sort((a, b) => (a.gap_order ?? 0) - (b.gap_order ?? 0));
  const allOptions = [...options].sort((a, b) => a.position - b.position);

  return (
    <View style={styles.container}>
      {/* Texto com lacunas */}
      <View style={styles.textWrap}>
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            return <Text key={i} style={styles.bodyText}>{seg.value}</Text>;
          }
          const filled = answers[seg.index];
          return (
            <View key={i} style={[styles.slot, filled && styles.slotFilled]}>
              <Text style={[styles.slotText, filled && styles.slotTextFilled]}>
                {filled ?? '     '}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Pills de palavras */}
      <View style={styles.optionsWrap}>
        {allOptions.map((opt) => {
          const usedInSlot = answers.indexOf(opt.word) >= 0;
          return (
            <Pressable
              key={opt.id}
              style={[styles.pill, usedInSlot && styles.pillUsed]}
              onPress={() => {
                if (usedInSlot) {
                  // Deselecionar
                  const slotIdx = answers.indexOf(opt.word);
                  onAnswer(slotIdx, '');
                } else {
                  // Preencher próxima lacuna vazia
                  const nextEmpty = segments
                    .filter((s): s is { type: 'slot'; index: number } => s.type === 'slot')
                    .find((s) => !answers[s.index]);
                  if (nextEmpty !== undefined) {
                    onAnswer(nextEmpty.index, opt.word);
                  }
                }
              }}
            >
              <Text style={[styles.pillText, usedInSlot && styles.pillTextUsed]}>{opt.word}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20 },
  textWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.gray[50],
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bodyText: { fontSize: 15, color: colors.foreground, lineHeight: 24 },
  slot: {
    borderBottomWidth: 2,
    borderBottomColor: colors.blue[500],
    minWidth: 60,
    paddingHorizontal: 4,
    marginHorizontal: 2,
  },
  slotFilled: {
    backgroundColor: colors.blue[50],
    borderRadius: 4,
    borderBottomWidth: 0,
  },
  slotText: { fontSize: 14, color: colors.gray[400], textAlign: 'center' },
  slotTextFilled: { color: colors.blue[700], fontWeight: '700' },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: colors.blue[500],
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: colors.blue[700],
  },
  pillUsed: {
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[300],
  },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pillTextUsed: { color: colors.gray[400] },
});

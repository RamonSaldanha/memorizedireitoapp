import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CompletedSegment as CompletedSegmentData, SegmentAnswer } from '../../api/play';
import { colors } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';

type Token =
  | { type: 'text'; text: string; wordIndex: number }
  | { type: 'space'; text: string; wordIndex: -1 }
  | { type: 'marker'; wordIndex: number }
  | { type: 'answer'; text: string; wordIndex: number; answer: SegmentAnswer };

function buildTokens(originalText: string, structuralMarker: string, answers: SegmentAnswer[] | null): Token[] {
  const parts = originalText.split(/(\s+)/);
  const answerMap = new Map<number, SegmentAnswer>();
  if (answers) {
    for (const a of answers) answerMap.set(a.word_position, a);
  }
  const markerWordCount = structuralMarker
    ? structuralMarker.split(/\s+/).filter((w) => w.length > 0).length
    : 0;

  let wordIndex = 0;
  const out: Token[] = [];
  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      out.push({ type: 'space', text: part, wordIndex: -1 });
      continue;
    }
    const idx = wordIndex++;
    if (idx < markerWordCount) {
      out.push({ type: 'marker', wordIndex: idx });
      continue;
    }
    if (idx === markerWordCount && /^[-–—]$/.test(part)) {
      out.push({ type: 'marker', wordIndex: idx });
      continue;
    }
    const a = answerMap.get(idx);
    if (a) out.push({ type: 'answer', text: part, wordIndex: idx, answer: a });
    else out.push({ type: 'text', text: part, wordIndex: idx });
  }

  const filtered = out.filter((t) => t.type !== 'marker');
  while (filtered.length > 0 && filtered[0].type === 'space') filtered.shift();
  while (filtered.length > 0 && filtered[filtered.length - 1].type === 'space') filtered.pop();
  return filtered;
}

export function CompletedSegmentView({ segment }: { segment: CompletedSegmentData }) {
  const { isDark } = useAppearance();

  const tokens = useMemo(
    () => buildTokens(segment.original_text, segment.structural_marker ?? '', segment.answers),
    [segment.uuid],
  );

  const bodyColor = isDark ? colors.gray[500] : colors.gray[400];
  const markerColor = isDark ? colors.gray[400] : colors.gray[500];

  return (
    <View style={styles.container}>
      <Text style={[styles.bodyText, { color: bodyColor }]}>
        {segment.structural_marker ? (
          <Text style={[styles.marker, { color: markerColor }]}>{segment.structural_marker} </Text>
        ) : null}
        {tokens.map((t, i) => {
          if (t.type === 'space') return <Text key={i}>{t.text}</Text>;
          if (t.type === 'text') return <Text key={i}>{t.text}</Text>;
          if (t.type === 'answer') {
            if (t.answer.is_correct) {
              return (
                <Text key={i} style={styles.correct}>{t.text}</Text>
              );
            }
            return (
              <Text key={i}>
                <Text style={styles.wrong}>{t.answer.user_word}</Text>
                <Text> </Text>
                <Text style={styles.correctionInline}>{t.answer.correct_word}</Text>
              </Text>
            );
          }
          return null;
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    opacity: 0.6,
    paddingVertical: 12,
  },
  bodyText: {
    fontSize: 17,
    lineHeight: 28,
    fontWeight: '400',
  },
  marker: {
    fontWeight: '700',
  },
  correct: {
    backgroundColor: colors.game.lacunaCorrectBg,
    color: colors.green[700],
    fontWeight: '700',
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  wrong: {
    backgroundColor: 'rgba(254,226,226,0.5)',
    color: colors.red[400],
    textDecorationLine: 'line-through',
    paddingHorizontal: 8,
    borderRadius: 999,
    fontSize: 16,
  },
  correctionInline: {
    backgroundColor: colors.game.lacunaCorrectBg,
    color: colors.green[700],
    fontWeight: '700',
    paddingHorizontal: 8,
    borderRadius: 999,
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ActiveSegment, SegmentAnswer } from '../../api/play';
import { colors } from '../../theme/colors';

type Props = {
  segment: ActiveSegment;
  userSelections: Record<number, string>;
  verified: boolean;
  verificationResults: SegmentAnswer[];
  onUnselect: (gapOrder: number) => void;
  onLayout?: (y: number) => void;
};

type Token =
  | { type: 'text'; text: string; wordIndex: number }
  | { type: 'space'; text: string; wordIndex: -1 }
  | { type: 'lacuna'; text: string; wordIndex: number; gapOrder: number; correctWord: string };

function buildTokens(originalText: string, structuralMarker: string, lacunas: ActiveSegment['lacunas']): Token[] {
  const parts = originalText.split(/(\s+)/);
  const lacunaMap = new Map(lacunas.map((l) => [l.word_position, l]));
  const markerWordCount = structuralMarker
    ? structuralMarker.split(/\s+/).filter((w) => w.length > 0).length
    : 0;

  let wordIndex = 0;
  const out: Token[] = [];
  let skipMarker = true;

  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      if (!skipMarker) out.push({ type: 'space', text: part, wordIndex: -1 });
      continue;
    }
    const idx = wordIndex++;
    if (idx < markerWordCount) continue;
    if (idx === markerWordCount && /^[-–—]$/.test(part)) continue;
    skipMarker = false;

    const lacuna = lacunaMap.get(idx);
    if (lacuna) {
      out.push({ type: 'lacuna', text: part, wordIndex: idx, gapOrder: lacuna.gap_order, correctWord: lacuna.word });
    } else {
      out.push({ type: 'text', text: part, wordIndex: idx });
    }
  }

  while (out.length > 0 && out[0].type === 'space') out.shift();
  while (out.length > 0 && out[out.length - 1].type === 'space') out.pop();
  return out;
}

export function ActiveChallenge({
  segment,
  userSelections,
  verified,
  verificationResults,
  onUnselect,
  onLayout,
}: Props) {
  const tokens = useMemo(
    () => buildTokens(segment.original_text, segment.structural_marker ?? '', segment.lacunas),
    [segment.uuid],
  );

  const resultByGap = useMemo(() => {
    const m = new Map<number, SegmentAnswer>();
    for (const r of verificationResults) m.set(r.gap_order, r);
    return m;
  }, [verificationResults]);

  const correctCount = verificationResults.filter((r) => r.is_correct).length;
  const minToPass = Math.ceil(segment.total_gaps * 0.7);
  const passed = correctCount >= minToPass;
  const percentage =
    segment.total_gaps > 0 ? Math.round((correctCount / segment.total_gaps) * 100) : 0;

  return (
    <View
      style={styles.container}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
    >
      <Text style={styles.body}>
        {segment.structural_marker ? (
          <Text style={styles.marker}>{segment.structural_marker} </Text>
        ) : null}
        {tokens.map((t, i) => {
          if (t.type === 'space') return <Text key={i}>{t.text}</Text>;
          if (t.type === 'text') return <Text key={i}>{t.text}</Text>;

          // lacuna
          const filled = userSelections[t.gapOrder];

          if (!verified && !filled) {
            return (
              <Text key={i} style={styles.lacunaEmpty}>
                {' (...) '}
              </Text>
            );
          }
          if (!verified && filled) {
            return (
              <Text
                key={i}
                style={styles.lacunaFilled}
                onPress={() => onUnselect(t.gapOrder)}
              >
                {' '}{filled}
                <Text style={styles.lacunaRemove}>{' ×'}</Text>
                {' '}
              </Text>
            );
          }
          // verified
          const r = resultByGap.get(t.gapOrder);
          if (r?.is_correct) {
            return (
              <Text key={i} style={styles.lacunaCorrect}>
                {' '}{t.correctWord}{' '}
              </Text>
            );
          }
          return (
            <Text key={i}>
              <Text style={styles.lacunaWrong}>{' '}{r?.user_word ?? ''}{' '}</Text>
              <Text> </Text>
              <Text style={styles.lacunaCorrect}>{' '}{t.correctWord}{' '}</Text>
            </Text>
          );
        })}
      </Text>

      {verified && segment.total_gaps > 0 && (
        <View style={styles.resultRow}>
          <View style={[styles.resultBadge, passed ? styles.resultBadgeOk : styles.resultBadgeFail]}>
            <Text style={[styles.resultBadgeIcon, passed ? styles.resultBadgeIconOk : styles.resultBadgeIconFail]}>
              {passed ? '✓' : '✗'}
            </Text>
          </View>
          <Text style={styles.resultText}>
            {correctCount} de {segment.total_gaps} corretas{' '}
            <Text style={styles.resultPct}>({percentage}%)</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 24 },
  body: {
    fontSize: 19,
    lineHeight: 32,
    color: colors.gray[900],
    fontWeight: '500',
  },
  marker: {
    fontWeight: '800',
    color: colors.gray[950],
  },
  lacunaEmpty: {
    backgroundColor: colors.game.lacunaEmptyBg,
    color: colors.game.lacunaEmptyText,
    fontWeight: '600',
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  lacunaFilled: {
    backgroundColor: colors.blue[50],
    color: colors.gray[800],
    fontWeight: '700',
    paddingHorizontal: 6,
    borderRadius: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#7dd3fc',
  },
  lacunaRemove: {
    color: colors.gray[400],
    fontWeight: '700',
    fontSize: 14,
  },
  lacunaCorrect: {
    backgroundColor: colors.game.lacunaCorrectBg,
    color: colors.green[700],
    fontWeight: '700',
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  lacunaWrong: {
    backgroundColor: colors.game.lacunaWrongBg,
    color: colors.red[700],
    fontWeight: '700',
    paddingHorizontal: 10,
    borderRadius: 999,
    textDecorationLine: 'line-through',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 16,
  },
  resultBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBadgeOk: { backgroundColor: colors.green[100] },
  resultBadgeFail: { backgroundColor: colors.red[100] },
  resultBadgeIcon: { fontSize: 18, fontWeight: '800' },
  resultBadgeIconOk: { color: colors.green[600] },
  resultBadgeIconFail: { color: colors.red[600] },
  resultText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[700],
  },
  resultPct: {
    fontSize: 13,
    color: colors.gray[400],
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { ActiveSegment, SegmentAnswer } from '../../api/play';
import { colors } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';

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
  const { isDark } = useAppearance();

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

  const bodyTextColor = isDark ? colors.gray[300] : colors.gray[900];
  const markerColor = isDark ? colors.gray[200] : colors.gray[950];
  const resultTextColor = isDark ? colors.gray[300] : colors.gray[700];
  const resultPctColor = isDark ? colors.gray[500] : colors.gray[400];

  return (
    <View
      style={styles.container}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
    >
      <View style={styles.bodyRow}>
        {segment.structural_marker ? (
          <Text style={[styles.bodyText, styles.marker, { color: markerColor }]}>
            {segment.structural_marker + ' '}
          </Text>
        ) : null}
        {tokens.map((t, i) => {
          if (t.type === 'space') {
            return <Text key={i} style={[styles.bodyText, { color: bodyTextColor }]}>{t.text}</Text>;
          }
          if (t.type === 'text') {
            return <Text key={i} style={[styles.bodyText, { color: bodyTextColor }]}>{t.text}</Text>;
          }

          // lacuna
          const filled = userSelections[t.gapOrder];

          if (!verified && !filled) {
            return (
              <View key={i} style={[styles.lacunaEmpty, { backgroundColor: isDark ? colors.game.lacunaEmptyBgDark : colors.game.lacunaEmptyBg }]}>
                <Text style={[styles.lacunaEmptyText, { color: isDark ? colors.game.lacunaEmptyTextDark : colors.game.lacunaEmptyText }]}>(...)</Text>
              </View>
            );
          }
          if (!verified && filled) {
            return (
              <Pressable key={i} onPress={() => onUnselect(t.gapOrder)}>
                <View style={[styles.lacunaFilled, isDark && { backgroundColor: '#1e293b', borderBottomColor: '#38bdf8' }]}>
                  <Text style={[styles.lacunaFilledText, isDark && { color: '#e2e8f0' }]}>{filled}</Text>
                  <Text style={[styles.lacunaRemove, isDark && { color: '#64748b' }]}>×</Text>
                </View>
              </Pressable>
            );
          }
          // verified
          const r = resultByGap.get(t.gapOrder);
          if (r?.is_correct) {
            return (
              <View key={i} style={styles.lacunaCorrect}>
                <Text style={styles.lacunaCorrectText}>{t.correctWord}</Text>
              </View>
            );
          }
          return (
            <React.Fragment key={i}>
              <View style={styles.lacunaWrong}>
                <Text style={styles.lacunaWrongText}>{r?.user_word ?? ''}</Text>
              </View>
              <Text style={[styles.bodyText, { color: bodyTextColor }]}> </Text>
              <View style={styles.lacunaCorrect}>
                <Text style={styles.lacunaCorrectText}>{t.correctWord}</Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      {verified && segment.total_gaps > 0 && (
        <View style={styles.resultRow}>
          <View style={[styles.resultBadge, passed ? styles.resultBadgeOk : styles.resultBadgeFail]}>
            <Text style={[styles.resultBadgeIcon, passed ? styles.resultBadgeIconOk : styles.resultBadgeIconFail]}>
              {passed ? '✓' : '✗'}
            </Text>
          </View>
          <Text style={[styles.resultText, { color: resultTextColor }]}>
            {correctCount} de {segment.total_gaps} corretas{' '}
            <Text style={[styles.resultPct, { color: resultPctColor }]}>({percentage}%)</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const PILL_FONT_SIZE = 19;

const styles = StyleSheet.create({
  container: { paddingVertical: 24 },

  bodyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: 4,
  },
  bodyText: {
    fontSize: PILL_FONT_SIZE,
    lineHeight: 32,
    fontWeight: '500',
  },
  marker: {
    fontWeight: '800',
  },

  // EMPTY (...) — pill yellow
  lacunaEmpty: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginHorizontal: 1,
    alignSelf: 'center',
  },
  lacunaEmptyText: {
    fontWeight: '600',
    fontSize: PILL_FONT_SIZE,
    lineHeight: 24,
  },

  // FILLED — pill sky com border-bottom
  lacunaFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#38bdf8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 1,
    alignSelf: 'center',
  },
  lacunaFilledText: {
    color: '#1e293b',
    fontWeight: '700',
    fontSize: PILL_FONT_SIZE,
    lineHeight: 24,
  },
  lacunaRemove: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
    lineHeight: 24,
  },

  // CORRECT (verified)
  lacunaCorrect: {
    backgroundColor: colors.game.lacunaCorrectBg,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    marginHorizontal: 1,
    alignSelf: 'center',
  },
  lacunaCorrectText: {
    color: colors.green[700],
    fontWeight: '700',
    fontSize: PILL_FONT_SIZE,
    lineHeight: 24,
  },

  // WRONG (verified)
  lacunaWrong: {
    backgroundColor: colors.game.lacunaWrongBg,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    marginHorizontal: 1,
    alignSelf: 'center',
  },
  lacunaWrongText: {
    color: colors.red[700],
    fontWeight: '700',
    fontSize: PILL_FONT_SIZE,
    lineHeight: 24,
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
  },
  resultPct: {
    fontSize: 13,
  },
});

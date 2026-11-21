import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameButton } from '../ui/GameButton';
import { Pressable, StyleSheet, Text, View, type TextLayoutEventData, type NativeSyntheticEvent } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Minus, Pause, Play, Plus, Rows3, WholeWord } from 'lucide-react-native';
import type { SummaryBlock, SummaryInline } from '../../api/trail';
import { colors } from '../../theme/colors';
import { useAppearance } from '../../hooks/useAppearance';

// Leitura guiada do resumo, como a da web (GuidedReading.vue): o texto escurece e um grupo de
// palavras claras avança na velocidade escolhida. Dois modos: por blocos (uma janela de
// palavras que desliza palavra a palavra) e régua de leitura (uma linha inteira por vez).
// Tocar numa palavra leva a leitura até ela; segurar o texto prende o realce. O resumo só
// conta como lido quando a leitura, tocando, passou por quase todas as palavras: rolar ou
// pular até o fim não vale.

const WPM_MIN = 100;
const WPM_MAX = 800;
const WPM_STEP = 20;
const WPM_DEFAULT = 240;
// Leitura por blocos: palavras claras antes e depois da palavra atual
const WINDOW_BEHIND = 1;
const WINDOW_AHEAD = 8;
// Parte das palavras que a leitura precisa ter percorrido, tocando, para o resumo contar como lido
const REQUIRED_COVERAGE = 0.9;
// Mesmas chaves da web, cada uma no seu armazenamento
const WPM_KEY = 'memorize:reading-wpm';
const MODE_KEY = 'memorize:reading-mode';

type Mode = 'chunk' | 'line';
type State = 'idle' | 'playing' | 'paused';

/* ===== O resumo em palavras ===== */

type Word = { text: string; trailing: string; bold?: boolean; italic?: boolean; code?: boolean };

/** Um trecho de texto corrido (título, parágrafo, célula, código), com as palavras dele. */
type TextNode = { key: string; kind: 'heading' | 'paragraph' | 'cell' | 'code'; level?: number; start: number; words: Word[] };

type LayoutNode =
  | { type: 'text'; node: TextNode }
  | { type: 'list'; key: string; ordered: boolean; start: number; items: LayoutNode[][] }
  | { type: 'quote'; key: string; children: LayoutNode[] }
  | { type: 'table'; key: string; head: TextNode[]; rows: TextNode[][] }
  | { type: 'rule'; key: string };

function buildLayout(blocks: SummaryBlock[]): { layout: LayoutNode[]; nodes: TextNode[]; total: number } {
  const nodes: TextNode[] = [];
  let counter = 0;
  let keys = 0;

  const textNode = (kind: TextNode['kind'], inlines: SummaryInline[], level?: number): TextNode => {
    const words: Word[] = [];
    for (const span of inlines) {
      for (const part of span.text.split(/(\s+)/)) {
        if (part === '') continue;
        if (/^\s+$/.test(part)) {
          if (words.length > 0) words[words.length - 1].trailing += part.includes('\n') ? '\n' : ' ';
          continue;
        }
        words.push({ text: part, trailing: '', bold: span.bold, italic: span.italic, code: span.code });
      }
    }
    const node: TextNode = { key: `t${keys++}`, kind, level, start: counter, words };
    counter += words.length;
    nodes.push(node);
    return node;
  };

  const walk = (list: SummaryBlock[]): LayoutNode[] =>
    list.map((block): LayoutNode => {
      switch (block.type) {
        case 'heading':
          return { type: 'text', node: textNode('heading', block.inlines, block.level) };
        case 'paragraph':
          return { type: 'text', node: textNode('paragraph', block.inlines) };
        case 'code':
          return { type: 'text', node: textNode('code', [{ text: block.text, code: true }]) };
        case 'list':
          return { type: 'list', key: `l${keys++}`, ordered: block.ordered, start: block.start, items: block.items.map(walk) };
        case 'quote':
          return { type: 'quote', key: `q${keys++}`, children: walk(block.blocks) };
        case 'table':
          return {
            type: 'table',
            key: `tb${keys++}`,
            head: block.head.map((cell) => textNode('cell', cell)),
            rows: block.rows.map((row) => row.map((cell) => textNode('cell', cell))),
          };
        default:
          return { type: 'rule', key: `r${keys++}` };
      }
    });

  const layout = walk(blocks);
  return { layout, nodes, total: counter };
}

/* ===== Estado da leitura ===== */

export type GuidedReading = ReturnType<typeof useGuidedReading>;

/**
 * A leitura guiada de um resumo. A tela põe `<GuidedSummary>` dentro da rolagem e
 * `<ReadingPanel>` por cima dela, fora da rolagem.
 */
export function useGuidedReading(
  blocks: SummaryBlock[],
  { onFinished, onFocus }: { onFinished: () => void; onFocus?: (y: number, height: number) => void },
) {
  const { layout, nodes, total } = useMemo(() => buildLayout(blocks), [blocks]);

  const [state, setState] = useState<State>('idle');
  const [mode, setModeState] = useState<Mode>('chunk');
  const [wpm, setWpmState] = useState(WPM_DEFAULT);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [coverage, setCoverage] = useState(0);

  const seen = useRef(new Uint8Array(total));
  const seenCount = useRef(0);
  const completed = useRef(false);
  // Linhas de cada trecho, medidas na tela: a palavra (índice no trecho) que abre cada linha
  const lineStarts = useRef<Record<string, number[]>>({});
  const [linesVersion, setLinesVersion] = useState(0);
  const textRefs = useRef<Record<string, Text | null>>({});
  const containerRef = useRef<View | null>(null);
  const onFinishedRef = useRef(onFinished);
  const onFocusRef = useRef(onFocus);
  onFinishedRef.current = onFinished;
  onFocusRef.current = onFocus;

  useEffect(() => {
    seen.current = new Uint8Array(total);
    seenCount.current = 0;
    completed.current = false;
    setIndex(0);
    setCoverage(0);
    setState('idle');
  }, [total, blocks]);

  // Velocidade e modo escolhidos ficam guardados para a próxima leitura
  useEffect(() => {
    AsyncStorage.multiGet([WPM_KEY, MODE_KEY])
      .then(([[, savedWpm], [, savedMode]]) => {
        const value = Number(savedWpm);
        if (value >= WPM_MIN && value <= WPM_MAX) setWpmState(value);
        if (savedMode === 'chunk' || savedMode === 'line') setModeState(savedMode);
      })
      .catch(() => {});
  }, []);

  const setWpm = useCallback((value: number) => {
    const next = Math.max(WPM_MIN, Math.min(WPM_MAX, value));
    setWpmState(next);
    AsyncStorage.setItem(WPM_KEY, String(next)).catch(() => {});
  }, []);

  const setMode = useCallback((value: Mode) => {
    setModeState(value);
    AsyncStorage.setItem(MODE_KEY, value).catch(() => {});
  }, []);

  /** Início de cada grupo (linha, na régua), em índices da leitura toda. */
  const lineGroups = useMemo(() => {
    const starts: number[] = [];
    for (const node of nodes) {
      const measured = lineStarts.current[node.key];
      if (measured && measured.length > 0) {
        for (const local of measured) starts.push(node.start + local);
      } else if (node.words.length > 0) {
        starts.push(node.start);
      }
    }
    return starts;
  }, [nodes, linesVersion]);

  const groupOf = useCallback(
    (wordIndex: number) => {
      let lo = 0;
      let hi = lineGroups.length - 1;
      let found = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lineGroups[mid] <= wordIndex) {
          found = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return found;
    },
    [lineGroups],
  );

  // Palavras claras agora
  const [litFrom, litTo] = useMemo((): [number, number] => {
    if (state === 'idle' || total === 0) return [-1, -1];
    if (mode === 'line' && lineGroups.length > 0) {
      const group = groupOf(index);
      return [lineGroups[group], (lineGroups[group + 1] ?? total) - 1];
    }
    return [Math.max(0, index - WINDOW_BEHIND), Math.min(total - 1, index + WINDOW_AHEAD)];
  }, [state, mode, index, total, lineGroups, groupOf]);

  // Relógio da leitura: avança enquanto toca e ninguém segura o texto
  useEffect(() => {
    if (state !== 'playing' || held || total === 0) return;

    const perWord = 60000 / wpm;
    const lineMode = mode === 'line' && lineGroups.length > 0;
    const group = lineMode ? groupOf(index) : 0;
    const groupEnd = lineMode ? (lineGroups[group + 1] ?? total) : index + 1;
    const wait = lineMode ? perWord * Math.max(1, groupEnd - lineGroups[group]) : perWord;

    const timer = setTimeout(() => {
      // A leitura ficou o tempo dela nessas palavras
      for (let i = lineMode ? lineGroups[group] : index; i < groupEnd; i++) {
        if (!seen.current[i]) {
          seen.current[i] = 1;
          seenCount.current++;
        }
      }
      const fraction = seenCount.current / total;
      setCoverage(fraction);

      if (groupEnd >= total) {
        setState('paused');
        if (!completed.current && fraction >= REQUIRED_COVERAGE) {
          completed.current = true;
          onFinishedRef.current();
        }
        return;
      }
      setIndex(groupEnd);
    }, wait);

    return () => clearTimeout(timer);
  }, [state, held, index, wpm, mode, total, lineGroups, groupOf]);

  // Mantém à vista o trecho que está sendo lido
  const focusedNode = useMemo(() => {
    if (state === 'idle') return null;
    return nodes.find((node) => index >= node.start && index < node.start + node.words.length) ?? null;
  }, [state, index, nodes]);

  useEffect(() => {
    if (!focusedNode) return;
    const ref = textRefs.current[focusedNode.key];
    const container = containerRef.current;
    if (!ref || !container || !onFocusRef.current) return;
    try {
      ref.measureLayout(
        container,
        (_x, y, _w, height) => onFocusRef.current?.(y, height),
        () => {},
      );
    } catch {
      // Sem medida, só não rola sozinho
    }
  }, [focusedNode?.key]);

  const toggle = useCallback(() => {
    if (state === 'playing') {
      setState('paused');
      return;
    }
    // Terminou: tocar de novo recomeça do início
    if (state === 'paused' && index >= total - 1) setIndex(0);
    setState('playing');
  }, [state, index, total]);

  const jumpTo = useCallback(
    (wordIndex: number) => {
      setIndex(wordIndex);
      setState((current) => (current === 'idle' ? 'paused' : current));
    },
    [],
  );

  const reportLines = useCallback((node: TextNode, event: NativeSyntheticEvent<TextLayoutEventData>) => {
    // Cada linha medida vira o início de um grupo: conta os caracteres até achar a palavra
    const starts: number[] = [];
    let wordIdx = 0;
    let consumed = 0;
    let wordEnd = node.words.length > 0 ? node.words[0].text.length + node.words[0].trailing.length : 0;
    for (const line of event.nativeEvent.lines) {
      while (wordIdx < node.words.length - 1 && consumed >= wordEnd) {
        wordIdx++;
        wordEnd += node.words[wordIdx].text.length + node.words[wordIdx].trailing.length;
      }
      if (wordIdx < node.words.length && (starts.length === 0 || starts[starts.length - 1] !== wordIdx)) starts.push(wordIdx);
      consumed += line.text.length;
    }
    const previous = lineStarts.current[node.key];
    if (!previous || previous.join() !== starts.join()) {
      lineStarts.current[node.key] = starts;
      setLinesVersion((v) => v + 1);
    }
  }, []);

  return {
    layout,
    total,
    state,
    mode,
    wpm,
    coverage,
    litFrom,
    litTo,
    held,
    setHeld,
    toggle,
    jumpTo,
    setWpm,
    setMode,
    reportLines,
    textRefs,
    containerRef,
  };
}

/* ===== Texto ===== */

type ParaProps = {
  node: TextNode;
  from: number;
  to: number;
  dim: boolean;
  isDark: boolean;
  onJump: (index: number) => void;
  onLines: (node: TextNode, event: NativeSyntheticEvent<TextLayoutEventData>) => void;
  setRef: (key: string, ref: Text | null) => void;
};

// Só o trecho em que o realce está (ou acabou de sair) desenha de novo a cada passo
const Para = memo(function Para({ node, from, to, dim, isDark, onJump, onLines, setRef }: ParaProps) {
  const base =
    node.kind === 'heading'
      ? [styles.heading, node.level && node.level >= 3 ? styles.headingSmall : null]
      : node.kind === 'cell'
        ? styles.cell
        : node.kind === 'code'
          ? styles.code
          : styles.paragraph;
  const normal = isDark ? colors.gray[100] : colors.gray[900];
  const faded = isDark ? colors.gray[600] : colors.gray[300];

  return (
    <Text ref={(ref) => setRef(node.key, ref)} style={[base, { color: dim ? faded : normal }]} onTextLayout={(event) => onLines(node, event)}>
      {node.words.map((word, i) => {
        const global = node.start + i;
        const lit = dim && global >= from && global <= to;
        return (
          <Text
            key={i}
            onPress={() => onJump(global)}
            style={[
              word.bold && styles.bold,
              word.italic && styles.italic,
              word.code && styles.inlineCode,
              lit && { color: normal },
            ]}
          >
            {word.text}
            {word.trailing}
          </Text>
        );
      })}
    </Text>
  );
}, (a, b) => a.node === b.node && a.from === b.from && a.to === b.to && a.dim === b.dim && a.isDark === b.isDark);

export function GuidedSummary({ reading }: { reading: GuidedReading }) {
  const { isDark } = useAppearance();
  const dim = reading.state !== 'idle';
  const { litFrom, litTo, jumpTo, reportLines, textRefs } = reading;

  const setRef = useCallback((key: string, ref: Text | null) => {
    textRefs.current[key] = ref;
  }, [textRefs]);

  const para = (node: TextNode) => {
    const overlaps = litFrom <= node.start + node.words.length - 1 && litTo >= node.start;
    return (
      <Para
        key={node.key}
        node={node}
        from={overlaps ? litFrom : -1}
        to={overlaps ? litTo : -1}
        dim={dim}
        isDark={isDark}
        onJump={jumpTo}
        onLines={reportLines}
        setRef={setRef}
      />
    );
  };

  const border = isDark ? colors.gray[700] : colors.gray[200];

  const render = (nodes: LayoutNode[]): React.ReactNode =>
    nodes.map((item) => {
      switch (item.type) {
        case 'text':
          return para(item.node);
        case 'list':
          return (
            <View key={item.key} style={styles.list}>
              {item.items.map((children, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={[styles.paragraph, styles.bullet, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
                    {item.ordered ? `${item.start + i}.` : '•'}
                  </Text>
                  <View style={styles.listBody}>{render(children)}</View>
                </View>
              ))}
            </View>
          );
        case 'quote':
          return (
            <View key={item.key} style={[styles.quote, { borderLeftColor: isDark ? colors.purple[700] : colors.purple[300], backgroundColor: isDark ? colors.gray[900] : colors.gray[50] }]}>
              {render(item.children)}
            </View>
          );
        case 'table':
          return (
            <View key={item.key} style={[styles.table, { borderColor: border }]}>
              {[item.head, ...item.rows].map((row, ri) => (
                <View key={ri} style={[styles.tableRow, ri > 0 && { borderTopWidth: 1, borderTopColor: border }, ri === 0 && { backgroundColor: isDark ? colors.gray[800] : colors.gray[100] }]}>
                  {row.map((cell, ci) => (
                    <View key={cell.key} style={[styles.tableCell, ci > 0 && { borderLeftWidth: 1, borderLeftColor: border }]}>
                      {para(cell)}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        default:
          return <View key={item.key} style={[styles.rule, { backgroundColor: border }]} />;
      }
    });

  return (
    <View
      ref={reading.containerRef}
      // Segurar o texto prende o realce; soltar continua
      onTouchStart={() => reading.state === 'playing' && reading.setHeld(true)}
      onTouchEnd={() => reading.setHeld(false)}
      onTouchCancel={() => reading.setHeld(false)}
      style={styles.summary}
    >
      {render(reading.layout)}
    </View>
  );
}

/* ===== Painel ===== */

/** Os controles da leitura, flutuando sobre o texto, perto do dedão. */
export function ReadingPanel({ reading }: { reading: GuidedReading }) {
  const { isDark } = useAppearance();
  const fg = isDark ? colors.gray[100] : colors.gray[800];
  const bg = isDark ? colors.gray[800] : '#ffffff';
  const edge = isDark ? colors.gray[700] : colors.gray[200];

  return (
    <View style={[styles.panel, { backgroundColor: bg, borderColor: edge }]}>
      <GameButton
        variant="main"
        size="sm"
        square
        onPress={reading.toggle}
        containerStyle={{ marginBottom: 4 }}
        accessibilityLabel={reading.state === 'playing' ? 'Pausar a leitura' : 'Iniciar a leitura'}
      >
        {reading.state === 'playing' ? (
          <Pause size={20} color={colors.family.brandInk} fill={colors.family.brandInk} />
        ) : (
          <Play size={20} color={colors.family.brandInk} fill={colors.family.brandInk} />
        )}
      </GameButton>
      <GameButton variant="ghost" size="sm" square onPress={() => reading.setWpm(reading.wpm + WPM_STEP)} accessibilityLabel="Mais rápido">
        <Plus size={20} color={fg} />
      </GameButton>
      <Text style={[styles.wpm, { color: fg }]}>{reading.wpm}</Text>
      <Text style={[styles.wpmLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>pal/min</Text>
      <GameButton variant="ghost" size="sm" square onPress={() => reading.setWpm(reading.wpm - WPM_STEP)} accessibilityLabel="Mais devagar">
        <Minus size={20} color={fg} />
      </GameButton>
      <View style={[styles.panelDivider, { backgroundColor: edge }]} />
      <GameButton
        variant="ghost"
        size="sm"
        square
        onPress={() => reading.setMode(reading.mode === 'chunk' ? 'line' : 'chunk')}
        accessibilityLabel={reading.mode === 'chunk' ? 'Trocar para régua de leitura' : 'Trocar para leitura por blocos'}
      >
        {reading.mode === 'chunk' ? <WholeWord size={20} color={fg} /> : <Rows3 size={20} color={fg} />}
      </GameButton>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 14 },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '800', marginTop: 8 },
  headingSmall: { fontSize: 18, lineHeight: 26 },
  paragraph: { fontSize: 17, lineHeight: 28 },
  cell: { fontSize: 15, lineHeight: 22 },
  code: { fontSize: 15, lineHeight: 22, fontFamily: 'monospace' },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  inlineCode: { fontFamily: 'monospace' },
  list: { gap: 8 },
  listItem: { flexDirection: 'row', gap: 8 },
  bullet: { width: 20, textAlign: 'right' },
  listBody: { flex: 1, gap: 8 },
  quote: { borderLeftWidth: 4, paddingLeft: 12, paddingVertical: 8, paddingRight: 8, borderRadius: 6, gap: 10 },
  table: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  tableRow: { flexDirection: 'row' },
  tableCell: { flex: 1, padding: 8 },
  rule: { height: 2, borderRadius: 1, marginVertical: 4 },

  panel: {
    position: 'absolute',
    right: 12,
    bottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 4,
  },
  wpm: { fontSize: 15, fontWeight: '800' },
  wpmLabel: { fontSize: 10, fontWeight: '600' },
  panelDivider: { height: 2, width: 28, borderRadius: 1, marginVertical: 2 },
});

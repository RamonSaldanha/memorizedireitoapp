import React, { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { G, Path, SvgAst, parse, type PathProps, type XmlAST } from 'react-native-svg';
import { avatarBodyHeight, buildAvatarSvg, type AvatarConfig } from '../../lib/avatar';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { DURATION_MS, bodyTransform, headTransform, lidTransform } from './motion';

/**
 * Quanto o desenho ganha para cima, na grade do avatar (200 de largura).
 *
 * Esticada, a cabeça sobe até 17 acima do topo do quadrado. Na web o SVG deixa
 * vazar (`overflow: visible`); aqui o `viewBox` começa 20 mais acima. Quem usa
 * desconta essa sobra do espaço acima do boneco — ver `AvatarStage`.
 */
export const HEADROOM = 20;

/**
 * Relógio da animação: `null` parado, ou o progresso de 0 a 1 enquanto toca.
 * Só os três ganchos assinam, então a cada quadro só eles re-renderizam.
 */
function createClock() {
  let progress: number | null = null;
  let frame: number | null = null;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  const stop = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };

  return {
    get: () => progress,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // Recomeça do zero a cada troca, como o SVG novo da web entra tocando do começo.
    play() {
      stop();
      const start = Date.now();
      const tick = () => {
        const p = (Date.now() - start) / DURATION_MS;
        progress = p >= 1 ? null : p;
        emit();
        frame = progress === null ? null : requestAnimationFrame(tick);
      };
      tick();
    },
    stop() {
      stop();
      progress = null;
    },
  };
}

type Clock = ReturnType<typeof createClock>;

const MotionContext = createContext<{ clock: Clock; bodyHeight: number; reduceMotion: boolean } | null>(null);

function useProgress() {
  const motion = useContext(MotionContext);

  if (!motion) throw new Error('Gancho de animação fora do AnimatedAvatar.');

  return { ...motion, progress: useSyncExternalStore(motion.clock.subscribe, motion.clock.get) };
}

/** `avatar-head` (cabeça e pescoço) e `avatar-body` (corpo). */
function MotionGroup({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { progress, bodyHeight, reduceMotion } = useProgress();

  // Com "reduzir movimento", cabeça e corpo ficam parados; só o olho pisca.
  const transform =
    progress === null || reduceMotion
      ? 'translate(0,0)'
      : className === 'avatar-head'
        ? headTransform(progress)
        : bodyTransform(progress, bodyHeight);

  return <G transform={transform}>{children}</G>;
}

/** `avatar-lid`: a pálpebra, que desce sobre o olho recortada no formato dele. */
function MotionLid({ className: _hook, ...props }: PathProps & { className?: string }) {
  const { progress } = useProgress();

  return <Path {...props} transform={lidTransform(progress ?? 1)} />;
}

const HOOKS: Record<string, unknown> = {
  'avatar-head': MotionGroup,
  'avatar-body': MotionGroup,
  'avatar-lid': MotionLid,
};

/**
 * Troca os três ganchos da lib pelos componentes animados, antes de o parser
 * transformar a árvore em elementos. O `style` do corpo só carrega a variável
 * CSS da web (`--avatar-body-h`), que aqui vem de `avatarBodyHeight`.
 */
function hookMotion(node: XmlAST): XmlAST {
  const hook = HOOKS[node.props.class as string];

  if (hook) {
    node.Tag = hook as XmlAST['Tag'];
    delete node.props.style;
  }

  node.children.forEach((child) => typeof child === 'object' && hookMotion(child));

  return node;
}

type Props = {
  config: Partial<AvatarConfig>;
  /** Largura em pixels. A altura é 10% maior, pela sobra de `HEADROOM`. */
  size: number;
};

/**
 * O avatar do palco do editor, que reage a cada troca de peça ou de cor. Porte
 * do `AvatarPreview.vue` da web: mesmo desenho, mesmos ganchos, mesmos números.
 *
 * Sem fundo: quem pinta é o palco. Com capacete, a lib não desenha os ganchos da
 * cabeça e do corpo (o visor os cortaria) e o boneco só pisca, como na web.
 */
export function AnimatedAvatar({ config, size }: Props) {
  const clock = useMemo(createClock, []);
  const reduceMotion = useReduceMotion();

  const ast = useMemo(() => parse(buildAvatarSvg(config, { animated: true, background: false }), hookMotion), [config]);
  const motion = useMemo(() => ({ clock, bodyHeight: avatarBodyHeight(config), reduceMotion }), [clock, config, reduceMotion]);

  // Anima a partir da primeira troca, não ao abrir a tela.
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) clock.play();
    mounted.current = true;
  }, [ast, clock]);

  useEffect(() => () => clock.stop(), [clock]);

  return (
    <MotionContext.Provider value={motion}>
      <SvgAst
        ast={ast}
        override={{ width: size, height: (size * (200 + HEADROOM)) / 200, viewBox: `0 ${-HEADROOM} 200 ${200 + HEADROOM}` }}
      />
    </MotionContext.Provider>
  );
}

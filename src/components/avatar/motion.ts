/**
 * Animação de troca de peça do editor de avatar: a cabeça cai amassada de
 * olhos fechados, sobe esticada abrindo os olhos de baixo para cima e assenta.
 *
 * **Os números são cópia dos keyframes da web**, em
 * `resources/js/components/avatar-editor/AvatarPreview.vue` (projeto memorize),
 * decalcados de um vídeo de referência. Mexeu lá, mexa aqui.
 *
 * Lá quem anima é o CSS; aqui são `transform` SVG nos mesmos três ganchos que a
 * lib desenha com `animated: true` (`avatar-head`, `avatar-body`, `avatar-lid`),
 * calculados quadro a quadro por `AnimatedAvatar`. A interpolação é linear
 * entre keyframes, como o `linear` do CSS.
 */

export const DURATION_MS = 450;

/** Cabeça e pescoço: deslocamento vertical e escala, em volta do queixo. */
const HEAD: [at: number, ty: number, sx: number, sy: number][] = [
  [0, 14.1, 1.05, 0.95],
  [0.06, 12.3, 1.05, 0.95],
  [0.11, 8.8, 1.03, 0.96],
  [0.17, 2.6, 1.01, 0.98],
  [0.24, -4.4, 0.99, 1.01],
  [0.33, -12.3, 0.96, 1.05],
  [0.43, -12.3, 0.96, 1.04],
  [0.48, -10.6, 0.97, 1.04],
  [0.54, -7, 0.98, 1.03],
  [0.59, -3.5, 0.99, 1.01],
  [0.65, -0.9, 1, 0.99],
  [0.7, 1.8, 1.01, 0.99],
  [0.76, 3.5, 1.01, 0.99],
  [1, 0, 1, 1],
];

/**
 * Pálpebra: desce 31 e cobre o olho até a cabeça começar a subir; depois sobe
 * em quatro tempos (o olho aparece com 37%, 61%, 80% e 100% da altura).
 */
const LID: [at: number, t: number][] = [
  [0, 31],
  [0.26, 31],
  [0.3, 20],
  [0.37, 13.5],
  [0.42, 8.4],
  [0.48, 0],
  [1, 0],
];

/** Valores do keyframe em `p` (0..1), interpolando o trecho em que ele cai. */
function sample<T extends number[]>(frames: T[], p: number): number[] {
  const i = frames.findIndex((frame) => frame[0] >= p);

  if (i === -1) return frames[frames.length - 1].slice(1);
  if (i === 0) return frames[0].slice(1);

  const [a, b] = [frames[i - 1], frames[i]];
  const k = (p - a[0]) / (b[0] - a[0]);

  return a.slice(1).map((v, j) => v + (b[j + 1] - v) * k);
}

/**
 * Cinco casas: a escala multiplica a distância até a origem (152 no queixo), e
 * com três casas o arredondamento já desloca a cabeça 0,05. Abaixo de 1e-6 o JS
 * passaria a escrever em notação exponencial, e o arredondamento evita isso.
 */
const n = (value: number) => Math.round(value * 100000) / 100000;

/**
 * `translateY(ty) scale(sx, sy)` com origem no queixo (100,152), escrito como
 * `transform` SVG. Vale o mesmo que o CSS com `transform-box: view-box`: a
 * conta é feita na grade local do grupo, então dentro do encaixe do coque e da
 * toga a origem acompanha a cena encolhida.
 */
export function headTransform(p: number): string {
  const [ty, sx, sy] = sample(HEAD, p);

  return `translate(100,${n(152 + ty)}) scale(${n(sx)},${n(sy)}) translate(-100,-152)`;
}

/**
 * O corpo amassa e estica preso ao pé da tela (100,200), com o topo descendo e
 * subindo exatamente o que o queixo desce e sobe. `bodyHeight` vem de
 * `avatarBodyHeight` da lib.
 */
export function bodyTransform(p: number, bodyHeight: number): string {
  const [ty] = sample(HEAD, p);

  return `translate(100,200) scale(1,${n(1 - ty / bodyHeight)}) translate(-100,-200)`;
}

export function lidTransform(p: number): string {
  const [t] = sample(LID, p);

  return `translate(0,${n(t)})`;
}

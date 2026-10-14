/**
 * Barba: bigode e barba grossa.
 *
 * As duas peças usam a cor do cabelo, como a sobrancelha, e ficam por cima da
 * cabeça e da orelha. O nariz passa por cima das duas, como nas referências.
 *
 * Com a boca, cada uma vai de um lado — por isso saem em camadas separadas:
 *
 *   under  a barba grossa, que a boca atravessa: a boca é desenhada por cima;
 *   over   o bigode, que fica por cima da boca: o sorriso sai por baixo dele.
 *
 * A barba não muda a boca: a boca é um grupo à parte, escolhido no editor.
 */

import type { BeardStyle } from '../types';

export interface BeardLayers {
    under: string;
    over: string;
}

/**
 * Bigode cheio, de dois lóbulos, com as pontas caindo para fora.
 *
 * Ocupa x 72..128 e sobe até y 100, atrás do fim do nariz (que termina em
 * y 114): o nariz é desenhado depois e cobre o meio de cima, e é isso que o
 * prende embaixo do nariz em vez de deixá-lo boiando na boca.
 *
 * A borda de baixo tem duas alturas: y≈119 no meio e y 125 nas pontas. É a
 * queda das pontas que faz o bigode ler como bigode, e não como uma faixa. Ele
 * vem depois da boca, então cobre a parte dela que sobe ao lado do nariz — a
 * boca aparece saindo por baixo dele.
 */
const MUSTACHE =
    'M100,106C103,101 107,100 111,100C120,100 127,105 128,113C129,120 127,125 123,125C119,125 117,120 113,119C107,118 103,117 100,114.5' +
    'C97,117 93,118 87,119C83,120 81,125 77,125C73,125 71,120 72,113C73,105 80,100 89,100C93,100 97,101 100,106Z';

/**
 * Barba grossa, **decalcada da imagem de referência**.
 *
 * O contorno foi extraído dos pixels da referência (758x654, cabeça em
 * x 164..569) e trazido para esta grade: na horizontal pela largura da cabeça,
 * na vertical pondo a borda de cima logo abaixo dos olhos (y 100), numa escala
 * de 0,375 — a mesma que leva o topo da cabeça de lá ao topo da cabeça daqui.
 * O desenho de lá é simétrico, e este também. Depois do decalque, a ponta da
 * costeleta e o pé foram arredondados e a borda de cima desceu 4px, a pedido;
 * o resto segue a referência.
 *
 *   costeleta  x 51,8..58,4, de y 80 para baixo. Começa onde termina a
 *              costeleta do cabelo curto, então as duas se emendam. Na
 *              referência ela esmaece em degradê; aqui a ponta é um meio
 *              círculo — cor chapada, sem o corte reto que o degradê deixaria.
 *   topo       reta em y 104, nove pixels abaixo dos olhos (95). A costeleta
 *              desce até ela num canto arredondado.
 *   lado       sai 1,2px da cabeça (x 53) na costeleta e **vai se afastando
 *              devagar**, sem degrau, até x 48,4 em y 128. É o que faz a barba
 *              passar por cima da orelha rente à linha da cabeça e só abrir
 *              abaixo dela.
 *   pé         em U, até y 168,5, dezesseis pixels abaixo do queixo. A curva
 *              começa já no ponto mais largo e vai até o meio, sem trecho
 *              reto: o pé reto da referência, nesta cabeça mais alta, deixava
 *              a barba com cara de caixa.
 *
 * Passar dos limites da cabeça é de propósito: a barba não depende do contorno
 * desta cabeça e continua cobrindo a mandíbula quando entrarem os outros
 * formatos (retângulo e oval).
 *
 * Não existe vão na boca: ela é desenhada por cima, no estilo que o usuário
 * escolheu.
 */
const FULL_BEARD =
    'M66.7,104C64,103.5 59.6,97.5 58.8,91.6L58.4,83.4' +
    // Ponta da costeleta esquerda: meio círculo de raio 3,3.
    'C58.4,81.58 56.92,80.1 55.1,80.1C53.28,80.1 51.8,81.58 51.8,83.4' +
    'C51.6,97 48.4,112 48.4,128' +
    // Pé em U: de cada lado a curva vai do ponto mais largo até o meio.
    'C48.4,151 67,168.5 100,168.5C133,168.5 151.6,151 151.6,128' +
    'C151.6,112 148.4,97 148.2,83.4' +
    // Ponta da costeleta direita.
    'C148.2,81.58 146.72,80.1 144.9,80.1C143.08,80.1 141.6,81.58 141.6,83.4' +
    'L141.2,91.6C140.4,97.5 136,103.5 133.3,104Z';

export function beard(style: BeardStyle, color: string): BeardLayers {
    if (style === 'bigode') {
        return { under: '', over: `<path d="${MUSTACHE}" fill="${color}"/>` };
    }

    if (style === 'grossa') {
        return { under: `<path d="${FULL_BEARD}" fill="${color}"/>`, over: '' };
    }

    return { under: '', over: '' };
}

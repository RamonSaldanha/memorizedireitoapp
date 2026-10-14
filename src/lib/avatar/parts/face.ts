/**
 * Traços do rosto: sobrancelha, cílio, olho, nariz e boca.
 *
 * Tudo chapado e sem contorno. Dois pontos são a assinatura do estilo e não têm
 * variação: o olho tem parte branca com pupila por cima, e o nariz é uma gota
 * de base redonda.
 */

import { skinInk } from '../color';
import {
    BROW_T,
    BROW_W,
    BROW_X,
    BROW_Y,
    EYE_H,
    EYE_W,
    EYE_X,
    EYE_Y,
    INK,
    LASH_T,
    NOSE_H,
    NOSE_W,
    NOSE_Y,
    PUPIL_R,
    PUPIL_X,
    PUPIL_Y,
    roundedRect,
} from '../geometry';
import type { BrowStyle, MouthStyle } from '../types';
import { both } from './svg';

/**
 * A sobrancelha sai em duas camadas porque o cílio tem de ser desenhado **depois
 * do olho** — antes, a cápsula branca o cobriria. Mesmo arranjo do cabelo.
 */
export interface BrowLayers {
    brow: string;
    lashes: string;
}

/**
 * Cílios: três traços no canto de fora e de cima da cápsula do olho.
 *
 * Duas medidas decidem se a peça lê como cílio ou como garra de passarinho, e
 * ambas erraram na primeira tentativa:
 *
 *   **A abertura do leque.** Espalhados em 68 graus — o de baixo quase deitado,
 *   o de cima quase em pé — os três viram uma pata. Fechados em 25 graus, todos
 *   varrendo para cima e para fora, viram cílio.
 *
 *   **A proporção.** Traço de 7 de comprimento por 4 de grossura é um toco. A
 *   2:1 (LASH_T 3) ele afina o bastante para ler como fio.
 *
 * Cada raiz entra ~1px na cápsula (centro 73,5/79,5, raio 11,5): desenhados
 * depois do olho, é esse pedacinho por cima do branco que prende o cílio à
 * pálpebra em vez de deixá-lo boiando ao lado do rosto.
 *
 * As pontas param em x 59 — a cabeça começa em 53, e cílio furando a silhueta lê
 * como falha de render. Em y param em 63, com 5px de folga até a sobrancelha.
 */
const LASHES = ['M64.5,74L59,70', 'M67.5,70.5L63,65.5', 'M71,68.5L68,63'];

/**
 * Três opções na mesma faixa (y 49..62), então trocar de uma para a outra nunca
 * mexe no resto do rosto:
 *
 *   reta      barra grossa chapada
 *   arqueada  traço que sobe no meio e desce nas duas pontas
 *   cilios    o mesmo traço, mais fino e de arco mais alto, com os cílios
 *
 * `cilios` não é só "arqueada mais cílio": a sobrancelha dela é 1px mais fina e
 * o arco sobe quase 2px a mais. Senão duas das três opções sairiam iguais na
 * miniatura do editor.
 */
export function brows(style: BrowStyle, color: string): BrowLayers {
    if (style === 'cilios') {
        const arch = `M${BROW_X},60Q${BROW_X + 12},46 ${BROW_X + BROW_W},55`;

        return {
            brow: both(`<path d="${arch}" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/>`),
            lashes: both(
                LASHES.map((d) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${LASH_T}" stroke-linecap="round"/>`).join(''),
            ),
        };
    }

    if (style === 'arqueada') {
        const arch = `M${BROW_X},60Q${BROW_X + 12},49 ${BROW_X + BROW_W},56`;

        return {
            brow: both(`<path d="${arch}" fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round"/>`),
            lashes: '',
        };
    }

    return {
        brow: both(`<path d="${roundedRect(BROW_X, BROW_Y, BROW_W, BROW_T, BROW_T / 2)}" fill="${color}"/>`),
        lashes: '',
    };
}

/** Cápsula branca com a pupila por cima, puxada para o lado de dentro. */
export function eyes(): string {
    return both(
        `<path d="${roundedRect(EYE_X, EYE_Y, EYE_W, EYE_H, EYE_W / 2)}" fill="#FFFFFF"/>` +
            `<circle cx="${PUPIL_X}" cy="${PUPIL_Y}" r="${PUPIL_R}" fill="${INK}"/>`,
    );
}

/**
 * Pálpebra da animação de troca de peça do editor (ver `AvatarPreview.vue`).
 *
 * É uma faixa da cor da pele recortada no formato dos dois olhos. Parada, ela
 * fica 3 acima deles e não aparece. A animação a desce 31 sobre os olhos, que
 * somem, e a sobe de volta: o olho reabre de baixo para cima, com a borda de
 * cima reta, como no vídeo de referência. Encolher o olho, em vez disso, faria
 * ele abrir do centro para cima e para baixo.
 *
 * O recorte é 0,75 maior que o olho em volta: do mesmo tamanho, a borda
 * suavizada do branco vazava em volta da pálpebra fechada, num contorno claro.
 * A folga não encosta em nada: o cabelo mais perto é a lateral do liso e do
 * afro, em x 57, e o recorte começa em 61,25.
 *
 * Vai logo depois do olho, então o cílio e os óculos continuam por cima dela.
 */
export function eyelid(skin: string, clipId: string): { clip: string; lid: string } {
    const bleed = 0.75;
    const eye = (x: number) => roundedRect(x - bleed, EYE_Y - bleed, EYE_W + 2 * bleed, EYE_H + 2 * bleed, EYE_W / 2 + bleed);

    return {
        clip: `<clipPath id="${clipId}"><path d="${eye(EYE_X) + eye(200 - EYE_X - EYE_W)}"/></clipPath>`,
        lid: `<g clip-path="url(#${clipId})"><path class="avatar-lid" d="M${EYE_X - 2},${EYE_Y - 33}H${200 - EYE_X + 2}V${EYE_Y - 3}H${EYE_X - 2}Z" fill="${skin}"/></g>`,
    };
}

/**
 * Gota num tom de contraste da pele: topo estreito e arredondado entre os
 * olhos, alargando até a base, que é um meio círculo.
 */
export function nose(skin: string): string {
    const r = NOSE_W / 2;
    const top = NOSE_Y;
    const base = NOSE_Y + NOSE_H - r; // centro do meio círculo da base
    const k = r * 0.55; // alça de Bézier de um quarto de círculo

    const d =
        `M100,${top}C${100 + r / 2},${top} ${100 + r},${base - 7} ${100 + r},${base}` +
        `C${100 + r},${base + k} ${100 + k},${base + r} 100,${base + r}` +
        `C${100 - k},${base + r} ${100 - r},${base + k} ${100 - r},${base}` +
        `C${100 - r},${base - 7} ${100 - r / 2},${top} 100,${top}Z`;

    return `<path d="${d}" fill="${skinInk(skin, 0.2)}"/>`;
}

/*
 * Bocas, **decalcadas das imagens de referência**.
 *
 * As duas referências têm o mesmo zoom (nariz de 42px, olho de 97px). A escala
 * veio da largura do olho, que ocupa a mesma fração do rosto lá e aqui, e foi
 * aumentada em 25%: na escala exata a boca ficava pequena ao lado do nariz
 * daqui, que é mais largo que o de lá. A posição é contada a partir do fim do
 * nariz (100,114).
 *
 * Como nas referências, as duas ficam **deslocadas para a esquerda** do nariz,
 * e não centradas no rosto.
 */

/**
 * Sorriso: meio sorriso. Sobe à esquerda, ao lado do nariz, e termina reto logo
 * abaixo dele — nada do arco simétrico e fundo de antes. Traço grosso de ponta
 * redonda, na pele escurecida em 69%: é o tom da linha da referência, e escuro o
 * bastante para aparecer também sobre a barba, como lá.
 */
const SMILE = 'M78.13,113C82.5,117.75 92.5,124.63 105.5,124.63';

/**
 * Boca aberta, **sem ponta nenhuma**: lóbulo redondo à esquerda, fundo em U e
 * ponta direita redonda. A língua ocupa a parte de baixo à esquerda, e a borda
 * de baixo dela é o mesmo trecho da borda da boca, então não sobra filete escuro
 * embaixo. Os dois tons são fixos, os da referência.
 */
const OPEN_MOUTH =
    'M79.25,115C79.25,112.25 81.75,110.5 85,110.5C89.5,110.5 91.75,118.5 97.5,118.5C102,118.5 106.38,119.5 106.38,122.63' +
    'C106.38,126.5 102,128.88 96.88,128.88C88.13,128.88 79.25,122.13 79.25,115Z';
const TONGUE =
    'M81.4,121.14C82.38,119 83.75,118.13 86.25,118.13C91.88,118.13 96.88,122.75 99.1,128.7L96.88,128.88C90.75,128.88 84.56,125.56 81.4,121.14Z';
const MOUTH_INSIDE = '#96282B';
const TONGUE_COLOR = '#CB4B4F';

export function mouth(style: MouthStyle, skin: string): string {
    if (style === 'aberta') {
        return `<path d="${OPEN_MOUTH}" fill="${MOUTH_INSIDE}"/><path d="${TONGUE}" fill="${TONGUE_COLOR}"/>`;
    }

    return `<path d="${SMILE}" fill="none" stroke="${skinInk(skin, 0.69)}" stroke-width="5.4" stroke-linecap="round"/>`;
}

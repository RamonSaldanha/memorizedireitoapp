/**
 * Acessórios: brinco e óculos.
 *
 * As duas peças são duplas e saem de `both()`, então aqui só o lado esquerdo é
 * desenhado. A exceção é a ponte do óculos, que é centrada: espelhá-la só
 * desenharia a mesma coisa duas vezes.
 */

import { shade } from '../color';
import {
    BRIDGE_Y,
    EARRING_X,
    HOOP_R,
    HOOP_T,
    HOOP_Y,
    STUD_R,
    STUD_Y,
    TEMPLE_END_X,
    TEMPLE_END_Y,
    roundedRect,
} from '../geometry';
import type { EarringStyle, GlassesStyle } from '../types';
import { both } from './svg';

/**
 * Brinco no lóbulo.
 *
 * A ordem importa mais aqui do que o traçado, e ela é uma fatia estreita: **entre
 * a roupa e a cabeça**.
 *
 *   Depois da orelha, que por sua vez vem depois da massa do cabelo — então o
 *   brinco pendura na orelha visível mesmo com cabelo comprido ou chanel.
 *
 *   Antes da cabeça, porque a argola é mais larga que a orelha e avança até
 *   x 58, cinco pixels por cima da silhueta do rosto (que começa em 53).
 *   Desenhada depois, esse pedaço fica na frente da bochecha e o brinco parece
 *   colado no rosto. Desenhada antes, o rosto o cobre: a argola sai da orelha,
 *   contorna por fora e se enfia atrás do queixo, como um aro atravessado no
 *   lóbulo de verdade.
 */
export function earrings(style: EarringStyle, color: string): string {
    if (style === 'argola') {
        return both(`<circle cx="${EARRING_X}" cy="${HOOP_Y}" r="${HOOP_R}" fill="none" stroke="${color}" stroke-width="${HOOP_T}"/>`);
    }

    if (style === 'simples') {
        return both(`<circle cx="${EARRING_X}" cy="${STUD_Y}" r="${STUD_R}" fill="${color}"/>`);
    }

    return '';
}

/**
 * Armação retangular, do óculos de grau: 33 x 30 com canto de raio 5.
 *
 * O olho daqui é uma cápsula em pé (23 x 27), então nenhuma lente que o cubra
 * pode ser deitada como num óculos retangular de verdade. O que dá o caráter é o
 * **canto**, não a proporção: raio 5 numa caixa quase quadrada lê como angular
 * na hora, ainda mais ao lado de uma lente oval.
 */
const RECT_LENS = roundedRect(57, 66, 33, 30, 5);
const RECT_BRIDGE_X = 90;
const RECT_TEMPLE = `M58,71L${TEMPLE_END_X},${TEMPLE_END_Y}`;
const RECT_FRAME_T = 4.5;

/**
 * Armação oval fina, do óculos de sol — a lente pequena e deitada do Kurt Cobain.
 *
 * Elipse de 32 x 28 no centro da cápsula do olho (73,5/81,5). Os números são o
 * menor oval que ainda engole a cápsula inteira: com ry 13 o topo do branco
 * escapava, e só não aparecia porque o aro o cobria — coberto por acaso, não por
 * projeto. Com ry 14 é o próprio preenchimento da lente que cobre.
 *
 * O aro é mais fino que o do retangular (3,5 contra 4,5). É metade da diferença
 * entre as duas peças: uma é grossa e angular, a outra fina e redonda.
 */
const OVAL_CX = 73.5;
const OVAL_CY = 81.5;
const OVAL_RX = 16;
const OVAL_RY = 14;
/** Onde a elipse passa na altura da ponte — ela é mais estreita ali do que no meio. */
const OVAL_BRIDGE_X = 87;
const OVAL_TEMPLE = `M59,75L${TEMPLE_END_X},${TEMPLE_END_Y}`;
const OVAL_FRAME_T = 3.5;

/**
 * Óculos.
 *
 * As duas variações não compartilham armação: uma é retangular e a outra oval.
 * A cor também não faz a mesma coisa nas duas:
 *
 *   grau  lente vazada, e a cor escolhida pinta o aro — o olho aparece inteiro.
 *   sol   lente preenchida com a cor escolhida, e o aro sai dela escurecido.
 *
 * Por isso a paleta rende nos dois: num tom quase preto o de sol vira óculos
 * escuro clássico, e num tom vivo vira lente colorida.
 */
export function glasses(style: GlassesStyle, color: string): string {
    if (style === 'nenhum') {
        return '';
    }

    const sol = style === 'sol';

    const frame = sol ? shade(color, -0.35) : color;
    const thickness = sol ? OVAL_FRAME_T : RECT_FRAME_T;
    const stroke = `stroke="${frame}" stroke-width="${thickness}"`;

    const lens = sol
        ? `<ellipse cx="${OVAL_CX}" cy="${OVAL_CY}" rx="${OVAL_RX}" ry="${OVAL_RY}" fill="${color}" ${stroke}/>`
        : `<path d="${RECT_LENS}" fill="none" ${stroke}/>`;

    const temple = `<path d="${sol ? OVAL_TEMPLE : RECT_TEMPLE}" fill="none" ${stroke} stroke-linecap="round"/>`;

    const inner = sol ? OVAL_BRIDGE_X : RECT_BRIDGE_X;
    const bridge = `<path d="M${inner},${BRIDGE_Y}H${200 - inner}" fill="none" ${stroke} stroke-linecap="round"/>`;

    return both(lens + temple) + bridge;
}

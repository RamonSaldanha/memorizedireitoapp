/**
 * Cabeça, orelhas e pescoço.
 *
 * Formato único: um retângulo arredondado. É o que dá a cara do estilo flat
 * geométrico — a variação vem do corpo e das cores, não do contorno do rosto.
 */

import { skinInk } from '../color';
import {
    BODIES,
    EAR_H,
    EAR_R,
    EAR_W,
    EAR_X,
    EAR_Y,
    HEAD_H,
    HEAD_R,
    HEAD_W,
    HEAD_X,
    HEAD_Y,
    NECK_TOP,
    roundedRect,
} from '../geometry';
import type { BodyShape } from '../types';
import { both } from './svg';

export function head(skin: string): string {
    return `<path d="${roundedRect(HEAD_X, HEAD_Y, HEAD_W, HEAD_H, HEAD_R)}" fill="${skin}"/>`;
}

/**
 * Orelha: retângulo arredondado num tom escurecido da pele, desenhado **antes**
 * da cabeça. O que faz a peça funcionar é a ordem — por cima ela vira uma asa
 * colada no rosto; por trás, sobra só a parte de fora encostando na silhueta.
 *
 * Vem depois da massa do cabelo (comprido e chanel), então aparece por cima dela.
 */
export function ears(skin: string): string {
    return both(`<path d="${roundedRect(EAR_X, EAR_Y, EAR_W, EAR_H, EAR_R)}" fill="${skinInk(skin, 0.14)}"/>`);
}

/**
 * Pescoço num tom levemente mais escuro, como sombra chapada. Vai até o pé do
 * canvas porque a roupa cobre o resto; o trecho que aparece é só o vão entre o
 * queixo e a gola.
 */
export function neck(body: BodyShape, skin: string): string {
    const w = BODIES[body].neck;

    return `<path d="${roundedRect(100 - w / 2, NECK_TOP, w, 200 - NECK_TOP, 10)}" fill="${skinInk(skin, 0.12)}"/>`;
}

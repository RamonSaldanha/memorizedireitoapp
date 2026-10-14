/**
 * Corpo e roupa.
 *
 * Uma peça só, em dois corpos: a camiseta é o próprio bloco dos ombros em cor
 * chapada, com a gola aberta deixando o pescoço aparecer. Os ombros são mais
 * estreitos que o canvas dos dois lados — na referência sempre sobra fundo.
 */

import { skinInk } from '../color';
import { BODIES } from '../geometry';
import type { BodyShape } from '../types';

export function clothes(body: BodyShape, color: string, skin: string): string {
    const { top, neck, path } = BODIES[body];
    const half = neck / 2;

    // A gola é o pescoço reaparecendo por cima da camiseta: um arco raso da
    // largura exata do pescoço, senão o vão fica mais largo que ele e desmonta.
    const collar = `M${100 - half},${top}Q100,${top + 14} ${100 + half},${top}Z`;

    // O mesmo tom do pescoço, senão aparece emenda na gola.
    return `<path d="${path}" fill="${color}"/><path d="${collar}" fill="${skinInk(skin, 0.12)}"/>`;
}

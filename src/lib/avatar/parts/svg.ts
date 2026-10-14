/**
 * Auxiliares de montagem do SVG.
 *
 * O canvas do avatar é `0 0 200 200` e o rosto é simétrico em torno de x = 100,
 * então toda peça dupla (olho, orelha, sobrancelha, brinco) é desenhada uma vez
 * do lado esquerdo e espelhada.
 */

/** Espelha um trecho em torno do eixo vertical do rosto. */
export function mirror(markup: string): string {
    return `<g transform="translate(200,0) scale(-1,1)">${markup}</g>`;
}

/** Desenha a peça no lado esquerdo e repete espelhada no direito. */
export function both(markup: string): string {
    return markup + mirror(markup);
}

/**
 * Grade do desenho, no canvas 200x200.
 *
 * Estilo flat geométrico: tudo é retângulo arredondado, elipse ou traço, em cor
 * chapada. Nada de gradiente, contorno ou sombreado.
 *
 * Esta rodada tem só a base — uma cabeça, dois corpos, uma roupa. As medidas
 * saíram das proporções das referências:
 *
 *   cabeça      largura ≈ 0,72 da altura      (retângulo bem arredondado)
 *   orelha      sobra ≈ 0,15 da largura da cabeça, o resto fica atrás
 *   nariz       gota de 16x24, com a base redonda
 *
 * O SVG não tem moldura: o fundo sangra o quadrado inteiro e quem recorta é o
 * container onde o avatar aparece. Por isso a cabeça inteira fica dentro do
 * círculo inscrito — só os ombros encostam nas bordas de baixo, onde um recorte
 * circular corta sem prejuízo.
 */

import type { BodyShape } from './types';

/** Tinta da pupila. */
export const INK = '#2B2140';

/**
 * Cabeça — retângulo arredondado único, o mesmo para todo mundo.
 *
 * Ocupa quase metade da largura do canvas: nas referências a cabeça enche o
 * quadro, e desenhar menor sobra fundo demais quando o layout recorta em círculo.
 */
export const HEAD_X = 53;
export const HEAD_W = 94;
export const HEAD_Y = 20;
export const HEAD_H = 132;
export const HEAD_R = 34;

/**
 * Orelha: retângulo arredondado desenhado **antes** da cabeça, de modo que só a
 * parte de fora apareça. Desenhar por cima transforma a peça numa asa colada no
 * rosto — foi o que estragou as versões anteriores.
 */
export const EAR_W = 20;
export const EAR_H = 29;
export const EAR_Y = 78;
export const EAR_R = 9;
/** 5px entram atrás da cabeça, então sobram 15 de silhueta. */
export const EAR_X = HEAD_X - EAR_W + 5;

/** Sobrancelha: barra grossa de ponta arredondada, alinhada com o olho. */
export const BROW_X = 62;
export const BROW_W = 23;
export const BROW_Y = 53;
export const BROW_T = 9;

/**
 * Olho: cápsula branca com pupila escura por cima.
 *
 * Os olhos ficam bem afastados de propósito — o nariz fica entre eles, e sem
 * esse vão as três peças se encostam.
 */
export const EYE_X = 62;
export const EYE_Y = 68;
export const EYE_W = 23;
export const EYE_H = 27;
/** Quase no centro da cápsula (x 73,5): puxar muito para dentro deixa vesgo. */
export const PUPIL_X = 76;
export const PUPIL_Y = 84;
export const PUPIL_R = 6;

/**
 * Nariz: gota — topo estreito e arredondado entre os olhos, base redonda de
 * raio NOSE_W / 2. Termina em y 114; as bocas partem daí (ver `parts/face.ts`).
 */
export const NOSE_W = 16;
export const NOSE_Y = 90;
export const NOSE_H = 24;

/**
 * Cílios: três traços curtos no canto de fora e de cima da cápsula do olho.
 *
 * O vão é apertado de propósito — sobram 9px entre a cápsula (x 62) e a borda da
 * cabeça (x 53), e 6px entre o topo da cápsula (y 68) e o pé da faixa da
 * sobrancelha (y 62). Por isso os traços são curtos: cílio furando a silhueta lê
 * como defeito de render, não como cílio.
 */
export const LASH_T = 3;

/**
 * Brinco: pendurado no lóbulo, que é o canto de baixo da orelha (x 38..58,
 * y 78..107). O `cx` fica dentro da silhueta da orelha para a peça nascer nela.
 */
export const EARRING_X = 47;
export const STUD_Y = 99;
export const STUD_R = 4.5;
/** Medidas da argola da referência, divididas por 5. Ocupa y 103..121. */
export const HOOP_Y = 112;
export const HOOP_R = 9;
export const HOOP_T = 4.5;

/**
 * Óculos. As duas armações partem da cápsula do olho (x 62..85, y 68..95) e
 * precisam cobri-la por inteiro: lente de sol com o branco do olho vazando por
 * cima lê como erro de render, não como óculos. O traçado de cada armação fica
 * em `parts/accessories.ts`, que é onde elas divergem.
 *
 * A ponte fica em y 71,8..76,3, bem acima do nariz, que começa em y 90.
 */
export const BRIDGE_Y = 74;
/** Onde a haste encosta no alto da orelha. As duas armações terminam aqui. */
export const TEMPLE_END_X = 44;
export const TEMPLE_END_Y = 80;

/** Começa atrás da cabeça; o trecho visível é só o vão até a gola. */
export const NECK_TOP = 134;

/**
 * Os dois corpos. `top` é onde o ombro começa e `neck` a largura do pescoço —
 * o corpo mais largo pede pescoço mais grosso, senão a cabeça parece encaixada
 * num palito.
 */
export interface BodySpec {
    top: number;
    neck: number;
    /**
     * Ombro: uma curva só, da borda de baixo até o alto do tronco. A tangente
     * sai vertical embaixo e chega horizontal em cima, então não existe quina
     * nem trecho reto — é o que dá o ombro redondo da referência. Cantinho
     * arredondado em retângulo não resolve: continua lendo como caixa.
     */
    path: string;
}

export const BODIES: Record<BodyShape, BodySpec> = {
    magro: {
        top: 168,
        neck: 34,
        path: 'M44,200C44,176 64,168 100,168C136,168 156,176 156,200Z',
    },
    gordo: {
        top: 162,
        neck: 42,
        path: 'M14,200C14,176 46,162 100,162C154,162 186,176 186,200Z',
    },
};

/** Retângulo arredondado como path — a forma de base de quase tudo aqui. */
export function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
    const rx = Math.min(r, w / 2);
    const ry = Math.min(r, h / 2);

    return (
        `M${x + rx},${y}H${x + w - rx}A${rx},${ry} 0 0 1 ${x + w},${y + ry}` +
        `V${y + h - ry}A${rx},${ry} 0 0 1 ${x + w - rx},${y + h}` +
        `H${x + rx}A${rx},${ry} 0 0 1 ${x},${y + h - ry}` +
        `V${y + ry}A${rx},${ry} 0 0 1 ${x + rx},${y}Z`
    );
}

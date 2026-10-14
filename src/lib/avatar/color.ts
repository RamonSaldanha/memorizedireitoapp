/**
 * Utilitários de cor do avatar.
 *
 * Todo o volume do desenho vem de camadas de cor sólida derivadas destas
 * funções — o sistema não usa gradiente em lugar nenhum.
 */

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
    return typeof value === 'string' && HEX.test(value);
}

/**
 * Clareia (`amount` positivo) ou escurece (`amount` negativo) uma cor hex.
 * `amount` vai de -1 a 1: `shade('#3366cc', -0.28)` devolve o tom de sombra.
 */
export function shade(hex: string, amount: number): string {
    const n = parseInt(hex.slice(1), 16);
    const target = amount < 0 ? 0 : 255;
    const p = Math.min(Math.abs(amount), 1);

    const mix = (channel: number) => Math.round((target - channel) * p + channel);

    const r = mix((n >> 16) & 255);
    const g = mix((n >> 8) & 255);
    const b = mix(n & 255);

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Brilho sobre uma cor chapada: a mesma cor com a luminosidade (HSL) 0,135
 * mais alta, sem mexer no matiz nem na saturação. É a distância entre o
 * `#3A281F` do cabelo da referência do coque e o `#664838` dos fios claros
 * dele. Misturar com branco, como faz `shade`, puxaria o castanho para o cinza.
 *
 * Numa cor clara demais para clarear (luminosidade acima de 0,75, como o
 * branco da paleta de cabelo), o brilho escurece na mesma medida.
 */
export function sheen(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    const h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;

    const lit = Math.min(1, Math.max(0, l + (l > 0.75 ? -0.135 : 0.135)));

    // De volta para RGB, com o matiz em sextos do círculo.
    const c = (1 - Math.abs(2 * lit - 1)) * s;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const m = lit - c / 2;
    const [r1, g1, b1] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];

    const channel = (v: number) => Math.round((v + m) * 255);

    return '#' + ((1 << 24) + (channel(r1) << 16) + (channel(g1) << 8) + channel(b1)).toString(16).slice(1);
}

/** Luminância percebida, de 0 a 255. */
export function luminance(hex: string): number {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;

    return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Tom de contraste sobre a pele — orelha, pescoço, nariz e boca.
 *
 * Sempre escurece, em toda a paleta. Nos tons retintos isso deixa o traço bem
 * discreto (no `#45291D` o nariz quase encosta no tom da pele), e a alternativa
 * de clarear nesses tons foi comparada lado a lado e descartada: a sombra em
 * volta do rosto tem que ser sombra, mesmo quando sutil.
 *
 * `shade` com valor negativo multiplica os canais, então o matiz se mantém — o
 * marrom escurece continuando marrom, sem puxar para cinza.
 */
export function skinInk(skin: string, strength: number): string {
    return shade(skin, -strength);
}

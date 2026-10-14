import { luminance } from './color';
import {
    BACKGROUND_COLORS,
    BEARDS,
    BODIES_OPTIONS,
    BROWS,
    CLOTHES_COLORS,
    EARRINGS,
    EARRING_COLORS,
    GLASSES,
    GLASSES_COLORS,
    HAIRS,
    HAIR_COLORS,
    MOUTHS,
    SKIN_COLORS,
    type ShapeOption,
} from './options';
import type { AvatarConfig } from './types';

function pick<T>(list: readonly T[]): T {
    return list[Math.floor(Math.random() * list.length)];
}

/**
 * Cores da lista que destoam o bastante da pele para não sumirem contra ela.
 * Vale para o fundo (senão a cabeça some) e para a sobrancelha (senão o rosto
 * fica sem expressão). Escolher na mão continua livre: o editor mostra tudo.
 */
function contrastingWith(skin: string, list: string[]): string[] {
    const usable = list.filter((c) => Math.abs(luminance(c) - luminance(skin)) > 40);

    return usable.length ? usable : list;
}

/**
 * Acessório só entra em parte dos sorteios. Sorteado como peça comum, ele cairia
 * em 2 de cada 3 avatares e todo mundo sairia de brinco e óculos ao mesmo tempo.
 */
function pickAccessory<T extends string>(list: ShapeOption<T>[], chance: number): T {
    if (Math.random() >= chance) {
        return 'nenhum' as T;
    }

    return pick(list.filter((o) => o.id !== 'nenhum')).id;
}

export function randomAvatarConfig(): AvatarConfig {
    const skin = pick(SKIN_COLORS);

    return {
        body: pick(BODIES_OPTIONS).id,
        hair: pick(HAIRS).id,
        brows: pick(BROWS).id,
        mouth: pick(MOUTHS).id,
        earrings: pickAccessory(EARRINGS, 0.4),
        glasses: pickAccessory(GLASSES, 0.3),
        beard: pickAccessory(BEARDS, 0.25),
        // Fantasia não entra no sorteio: é exclusiva de assinante e escolha dele.
        outfit: 'nenhum',
        skin,
        hairColor: pick(contrastingWith(skin, HAIR_COLORS)),
        clothesColor: pick(CLOTHES_COLORS),
        // As cores de acessório são sorteadas mesmo quando a peça é `nenhum`: o
        // servidor exige todas as chaves, e assim ligar o acessório no editor já
        // encontra uma cor escolhida em vez do default de sempre.
        earringColor: pick(EARRING_COLORS),
        glassesColor: pick(GLASSES_COLORS),
        background: pick(contrastingWith(skin, BACKGROUND_COLORS)),
    };
}

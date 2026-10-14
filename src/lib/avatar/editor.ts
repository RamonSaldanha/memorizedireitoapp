/**
 * Estrutura do editor de avatar: abas, grupos e o recorte da miniatura de cada
 * peça.
 *
 * Fica na lib, e não na página, porque são dois editores — o da web
 * (`pages/settings/Avatar.vue`) e o do app — e eles têm de mostrar as mesmas
 * abas, na mesma ordem, com as mesmas miniaturas.
 */

import {
    BACKGROUND_COLORS,
    BEARDS,
    BEARD_CROP,
    BODIES_OPTIONS,
    BROWS,
    CLOTHES_COLORS,
    EARRINGS,
    EARRING_COLORS,
    EAR_CROP,
    FACE_CROP,
    FULL_CROP,
    GLASSES,
    GLASSES_COLORS,
    HAIRS,
    HAIR_COLORS,
    MOUTHS,
    MOUTH_CROP,
    OUTFITS,
    SKIN_COLORS,
    type ShapeOption,
} from './options';
import type { AvatarColorKey, AvatarConfig, AvatarCrop, AvatarShapeKey } from './types';

export type EditorGroup =
    | { kind: 'shape'; key: AvatarShapeKey; label: string; options: ShapeOption<string>[]; crop: AvatarCrop }
    | { kind: 'color'; key: AvatarColorKey; label: string; colors: string[] };

export interface EditorTab {
    id: string;
    label: string;
    groups: EditorGroup[];
}

// Uma aba por região do desenho, com a peça e a cor dela lado a lado — trocar de
// cabelo numa aba e ir pintar em outra seria o pior dos dois mundos.
//
// A ordem acompanha como se monta um personagem: corpo, rosto, cabelo, enfeite.
// A cor do fundo cai em "Corpo" por eliminação, já que é o único controle que
// não é parte do boneco.
export const EDITOR_TABS: EditorTab[] = [
    {
        id: 'corpo',
        label: 'Corpo',
        groups: [
            { kind: 'shape', key: 'body', label: 'Corpo', options: BODIES_OPTIONS, crop: FULL_CROP },
            { kind: 'color', key: 'clothesColor', label: 'Cor da roupa', colors: CLOTHES_COLORS },
            { kind: 'color', key: 'background', label: 'Cor do fundo', colors: BACKGROUND_COLORS },
        ],
    },
    {
        id: 'rosto',
        label: 'Rosto',
        groups: [
            { kind: 'color', key: 'skin', label: 'Tom da pele', colors: SKIN_COLORS },
            { kind: 'shape', key: 'brows', label: 'Sobrancelha', options: BROWS, crop: FACE_CROP },
            { kind: 'shape', key: 'mouth', label: 'Boca', options: MOUTHS, crop: MOUTH_CROP },
        ],
    },
    {
        id: 'cabelo',
        label: 'Cabelo',
        groups: [
            { kind: 'shape', key: 'hair', label: 'Cabelo', options: HAIRS, crop: FULL_CROP },
            // A barba fica aqui, e não em "Rosto", porque a cor dela é a do cabelo.
            { kind: 'shape', key: 'beard', label: 'Barba', options: BEARDS, crop: BEARD_CROP },
            { kind: 'color', key: 'hairColor', label: 'Cor do cabelo, da sobrancelha e da barba', colors: HAIR_COLORS },
        ],
    },
    {
        id: 'acessorios',
        label: 'Acessórios',
        groups: [
            { kind: 'shape', key: 'earrings', label: 'Brinco', options: EARRINGS, crop: EAR_CROP },
            { kind: 'color', key: 'earringColor', label: 'Cor do brinco', colors: EARRING_COLORS },
            { kind: 'shape', key: 'glasses', label: 'Óculos', options: GLASSES, crop: FACE_CROP },
            { kind: 'color', key: 'glassesColor', label: 'Cor dos óculos', colors: GLASSES_COLORS },
        ],
    },
    {
        // Por último: a fantasia cobre o corpo inteiro por cima de tudo que
        // foi montado nas outras abas.
        id: 'fantasia',
        label: 'Fantasia',
        groups: [{ kind: 'shape', key: 'outfit', label: 'Fantasia', options: OUTFITS, crop: FULL_CROP }],
    },
];

/**
 * Config do avatar com uma peça trocada, para desenhar a miniatura da opção.
 *
 * As miniaturas recortadas no rosto saem sem fantasia: o capacete e a toga
 * mudam o tamanho e a altura da cabeça, e o rosto sairia do recorte.
 */
export function previewWith(config: AvatarConfig, key: AvatarShapeKey, optionId: string, crop: AvatarCrop): AvatarConfig {
    const preview = { ...config, [key]: optionId } as AvatarConfig;

    return crop === FULL_CROP ? preview : { ...preview, outfit: 'nenhum' };
}

/**
 * Catálogo de opções do avatar.
 *
 * Base enxuta: uma cabeça, dois corpos e uma roupa. A variedade vem das paletas,
 * que é onde ela rende mais por peça desenhada, e agora também dos acessórios.
 *
 * Os ids estão amarrados ao código de desenho em `parts/` — acrescentar um id
 * aqui exige acrescentar o desenho lá e a mesma lista em `config/avatar.php`
 * (que valida o que chega do navegador).
 *
 * As cores não têm whitelist: o servidor só exige o formato `#rrggbb`. Estas
 * paletas são sugestões da interface, então dá para mexer nelas à vontade.
 */

import type {
    AvatarConfig,
    AvatarCrop,
    BeardStyle,
    BodyShape,
    BrowStyle,
    EarringStyle,
    GlassesStyle,
    HairStyle,
    MouthStyle,
    OutfitStyle,
} from './types';

/**
 * Recorte das miniaturas do editor. Corpo e cabelo mudam a silhueta inteira,
 * então a miniatura mostra o avatar todo — enquadrar só um pedaço sobra vazio e
 * esconde justamente a comparação que a pessoa está fazendo.
 */
export const FULL_CROP: AvatarCrop = [0, 0, 200, 200];
/** Enquadra a cabeça, para as peças que só mudam a expressão. */
export const FACE_CROP: AvatarCrop = [36, 12, 128, 108];
/**
 * Enquadra as orelhas. Existe por causa da argola, que desce até y 121 e sairia
 * cortada no `FACE_CROP` (que termina em y 120); e o `FULL_CROP` deixaria o
 * brinco pequeno demais para se distinguir numa miniatura.
 */
export const EAR_CROP: AvatarCrop = [30, 44, 140, 100];
/**
 * Enquadra a metade de baixo do rosto. A barba grossa desce até y 168 e abre até
 * x 46 / 154, então nenhum dos outros recortes a mostra inteira.
 */
export const BEARD_CROP: AvatarCrop = [30, 64, 140, 116];
/**
 * Enquadra do nariz ao queixo. A boca desce até y 129, abaixo de onde o
 * `FACE_CROP` termina (y 120).
 */
export const MOUTH_CROP: AvatarCrop = [54, 82, 92, 76];

export interface ShapeOption<T extends string> {
    id: T;
    label: string;
    /**
     * Exclusiva de assinante. O editor mostra com cadeado para quem não assina,
     * e o servidor recusa salvar — a mesma lista fica em `premium` no
     * `config/avatar.php`, que é quem vale de verdade.
     */
    premium?: boolean;
}

export const BODIES_OPTIONS: ShapeOption<BodyShape>[] = [
    { id: 'magro', label: 'Magro' },
    { id: 'gordo', label: 'Gordo' },
];

export const HAIRS: ShapeOption<HairStyle>[] = [
    { id: 'nenhum', label: 'Careca' },
    { id: 'calvo', label: 'Calvo' },
    { id: 'curto', label: 'Curto' },
    { id: 'afro', label: 'Afro curto' },
    { id: 'chanel', label: 'Chanel' },
    { id: 'comprido', label: 'Comprido' },
    { id: 'liso', label: 'Liso' },
    { id: 'coque', label: 'Coque' },
];

export const BROWS: ShapeOption<BrowStyle>[] = [
    { id: 'reta', label: 'Reta' },
    { id: 'arqueada', label: 'Arqueada' },
    { id: 'cilios', label: 'Cílios' },
];

export const MOUTHS: ShapeOption<MouthStyle>[] = [
    { id: 'sorriso', label: 'Sorriso' },
    { id: 'aberta', label: 'Aberta' },
];

/** Fantasias: cobrem o corpo inteiro, como skin de jogo. */
export const OUTFITS: ShapeOption<OutfitStyle>[] = [
    { id: 'nenhum', label: 'Nenhuma' },
    { id: 'toga', label: 'Toga de juiz', premium: true },
    { id: 'astronauta', label: 'Astronauta', premium: true },
];

export const EARRINGS: ShapeOption<EarringStyle>[] = [
    { id: 'nenhum', label: 'Nenhum' },
    { id: 'argola', label: 'Argola' },
    { id: 'simples', label: 'Simples' },
];

export const GLASSES: ShapeOption<GlassesStyle>[] = [
    { id: 'nenhum', label: 'Nenhum' },
    { id: 'grau', label: 'De grau' },
    { id: 'sol', label: 'De sol' },
];

export const BEARDS: ShapeOption<BeardStyle>[] = [
    { id: 'nenhum', label: 'Nenhuma' },
    { id: 'bigode', label: 'Bigode' },
    { id: 'grossa', label: 'Barba grossa' },
];

export const SKIN_COLORS = ['#FBDCC2', '#F5DCC0', '#EFC09A', '#F0B489', '#EE8B72', '#DD7B5E', '#C6694E', '#A9563F', '#8C4633', '#45291D'];

/** Cabelo, sobrancelha, cílio e barba. */
export const HAIR_COLORS = [
    '#2B2C5E',
    '#241F1F',
    '#3A2C22',
    '#5C4331',
    '#8A5A33',
    '#C4562E',
    '#E2A94E',
    '#EFE7DA',
    '#9AA3AD',
    '#6E3E8E',
    '#2E7D6E',
    '#C2455F',
];

export const CLOTHES_COLORS = [
    '#2A9D8F',
    '#3D4A7A',
    '#C2455F',
    '#E8894A',
    '#5B5B96',
    '#4F7A3D',
    '#EFE7D8',
    '#2B2440',
    '#D9788F',
    '#3FA0DE',
    '#E5B33D',
    '#8A4B2A',
];

/** Metais primeiro, que é o que quase todo mundo escolhe num brinco. */
export const EARRING_COLORS = ['#F2C219', '#E5B33D', '#D9D9DE', '#9AA3AD', '#C97B4E', '#EFE7D8', '#2B2440', '#C2455F', '#3FA0DE', '#2E9E96'];

/**
 * No óculos de grau esta cor pinta o aro; no de sol pinta a lente. Por isso a
 * paleta começa nos tons escuros — são os que dão óculos escuro de verdade.
 */
export const GLASSES_COLORS = ['#2B2440', '#241F1F', '#3D4A7A', '#5C4331', '#8A5A33', '#9AA3AD', '#EFE7D8', '#E5B33D', '#C2455F', '#2A9D8F'];

export const BACKGROUND_COLORS = [
    '#F0AE3E',
    '#EE7A5A',
    '#6EC6BF',
    '#232A4D',
    '#F2E0A0',
    '#C9B6E8',
    '#B9E38A',
    '#E8E2D6',
    '#3FA0DE',
    '#F0C7D8',
    '#7A5C9E',
    '#2E9E96',
];

/** Usado quando o usuário nunca editou o avatar e como base da normalização. */
export const DEFAULT_AVATAR: AvatarConfig = {
    body: 'magro',
    hair: 'comprido',
    brows: 'reta',
    mouth: 'sorriso',
    earrings: 'nenhum',
    glasses: 'nenhum',
    beard: 'nenhum',
    outfit: 'nenhum',
    skin: '#EFC09A',
    hairColor: '#3A2C22',
    clothesColor: '#2A9D8F',
    earringColor: '#F2C219',
    glassesColor: '#2B2440',
    background: '#F0AE3E',
};

/** Listas de ids válidos, indexadas pela chave do config. Base da normalização. */
export const SHAPE_IDS = {
    body: BODIES_OPTIONS.map((o) => o.id),
    hair: HAIRS.map((o) => o.id),
    brows: BROWS.map((o) => o.id),
    mouth: MOUTHS.map((o) => o.id),
    earrings: EARRINGS.map((o) => o.id),
    glasses: GLASSES.map((o) => o.id),
    beard: BEARDS.map((o) => o.id),
    outfit: OUTFITS.map((o) => o.id),
} as const;

/**
 * Tipos do sistema de avatar.
 *
 * O avatar é guardado como um objeto de ids + cores hex (~200 bytes). O desenho
 * nunca é persistido: é sempre reconstruído a partir desta configuração, o que
 * permite que o app Android renderize o mesmo avatar mais adiante.
 *
 * Catálogo: uma cabeça, dois corpos, uma roupa, oito cabelos, três sobrancelhas,
 * duas bocas, dois brincos, dois óculos, um bigode, uma barba e duas fantasias.
 * Cada peça nova soma um id aqui, o desenho em `parts/` e a mesma lista em
 * `config/avatar.php`.
 */

export type BodyShape = 'magro' | 'gordo';
export type HairStyle = 'nenhum' | 'calvo' | 'curto' | 'afro' | 'chanel' | 'comprido' | 'liso' | 'coque';
export type BrowStyle = 'reta' | 'arqueada' | 'cilios';
export type MouthStyle = 'sorriso' | 'aberta';
export type EarringStyle = 'nenhum' | 'argola' | 'simples';
export type GlassesStyle = 'nenhum' | 'grau' | 'sol';
export type BeardStyle = 'nenhum' | 'bigode' | 'grossa';
export type OutfitStyle = 'nenhum' | 'toga' | 'astronauta';

export interface AvatarConfig {
    body: BodyShape;
    hair: HairStyle;
    /** `cilios` desenha a sobrancelha **e** os cílios; ver `parts/face.ts`. */
    brows: BrowStyle;
    mouth: MouthStyle;
    earrings: EarringStyle;
    glasses: GlassesStyle;
    /** Sem cor própria: usa `hairColor`. */
    beard: BeardStyle;
    /**
     * Fantasia: cobre o corpo inteiro no lugar da roupa, e `clothesColor` deixa
     * de valer enquanto ela estiver vestida. A de astronauta põe a cabeça
     * inteira, menor, dentro do visor do capacete. Exclusiva de assinante — as
     * opções pagas têm `premium` em `options.ts` e a mesma lista em
     * `config/avatar.php`.
     */
    outfit: OutfitStyle;
    skin: string;
    /** Pinta o cabelo, a sobrancelha, o cílio e a barba. */
    hairColor: string;
    clothesColor: string;
    earringColor: string;
    /** No óculos de grau pinta o aro; no de sol pinta a lente, e o aro sai dela. */
    glassesColor: string;
    background: string;
}

/** Chaves cujo valor é uma cor hex (`#rrggbb`), e não um id de opção. */
export const AVATAR_COLOR_KEYS = ['skin', 'hairColor', 'clothesColor', 'earringColor', 'glassesColor', 'background'] as const;

export type AvatarColorKey = (typeof AVATAR_COLOR_KEYS)[number];
export type AvatarShapeKey = Exclude<keyof AvatarConfig, AvatarColorKey>;

/** Recorte do viewBox: `[x, y, largura, altura]`. Usado nas miniaturas do editor. */
export type AvatarCrop = [number, number, number, number];

export interface BuildOptions {
    /**
     * Sufixo único para ids internos do SVG — hoje, o recorte do visor do
     * astronauta. Sem ele, `buildAvatarSvg` usa uma sequência própria.
     */
    uid?: string;
    /** Recorte opcional do viewBox. Sem ele, desenha o avatar inteiro. */
    crop?: AvatarCrop;
    /** Pinta o fundo. Desligado nas miniaturas de peça. */
    background?: boolean;
    /**
     * Desenha os ganchos da animação de troca de peça do editor: as classes
     * `avatar-head` e `avatar-body` e a pálpebra `avatar-lid`. O desenho parado
     * é o mesmo; quem anima é o CSS de `AvatarPreview.vue`.
     */
    animated?: boolean;
}

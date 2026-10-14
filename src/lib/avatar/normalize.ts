/**
 * Saneamento do config do avatar.
 *
 * O desenho é injetado com `v-html`, então nenhum valor pode chegar ao SVG sem
 * passar por aqui: id desconhecido vira o default, cor que não seja `#rrggbb`
 * vira a cor default. É esta função que garante que um `avatar_config` adulterado
 * no banco não consiga injetar markup.
 */

import { isHexColor } from './color';
import { DEFAULT_AVATAR, SHAPE_IDS } from './options';
import { AVATAR_COLOR_KEYS, type AvatarConfig } from './types';

type RawConfig = Partial<Record<keyof AvatarConfig, unknown>> | null | undefined;

export function normalizeAvatarConfig(raw: RawConfig): AvatarConfig {
    const source = (raw ?? {}) as Record<string, unknown>;
    const result = { ...DEFAULT_AVATAR };

    for (const key of Object.keys(SHAPE_IDS) as (keyof typeof SHAPE_IDS)[]) {
        const value = source[key];
        const allowed = SHAPE_IDS[key] as readonly string[];

        if (typeof value === 'string' && allowed.includes(value)) {
            // O elenco é seguro: o valor acabou de ser conferido contra a lista da própria chave.
            (result as Record<string, unknown>)[key] = value;
        }
    }

    for (const key of AVATAR_COLOR_KEYS) {
        const value = source[key];

        if (isHexColor(value)) {
            result[key] = value;
        }
    }

    return result;
}

/** `true` quando o usuário chegou a salvar um avatar (vs. cair no fallback de iniciais). */
export function hasAvatar(raw: RawConfig): boolean {
    return !!raw && typeof raw === 'object' && Object.keys(raw).length > 0;
}

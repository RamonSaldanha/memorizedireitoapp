import { colors } from './colors';

// GameButton 3D shadow — simulado com borderBottomWidth em RN
// O efeito visual é idêntico ao box-shadow: 0 4px 0 color-700 do web
export const gameShadow = {
  white: {
    shadowColor: colors.gray[300],
    borderBottomWidth: 4,
    borderBottomColor: colors.gray[300],
  },
  green: {
    shadowColor: colors.green[700],
    borderBottomWidth: 4,
    borderBottomColor: colors.green[700],
  },
  blue: {
    shadowColor: colors.blue[700],
    borderBottomWidth: 4,
    borderBottomColor: colors.blue[700],
  },
  purple: {
    shadowColor: colors.purple[700],
    borderBottomWidth: 4,
    borderBottomColor: colors.purple[700],
  },
  red: {
    shadowColor: colors.red[700],
    borderBottomWidth: 4,
    borderBottomColor: colors.red[700],
  },
} as const;

export type GameShadowVariant = keyof typeof gameShadow;

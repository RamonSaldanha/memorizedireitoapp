import { colors } from '../../theme/colors';

/**
 * Cores do onboarding, tiradas das classes do `Onboarding/Index.vue`.
 *
 * A web usa o Tailwind padrão para tudo que não é cinza. Alguns tons do
 * `colors.ts` do app divergem (o `blue[300]` é o sky, o `red` é o rose), então
 * os tons usados aqui ficam escritos com o nome da classe ao lado.
 */
export const tw = {
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue300: '#93c5fd',
  blue400: '#60a5fa',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue900: '#1e3a8a',
  // `blue-950/40` já composto sobre o gray-900 da página: nos cartões "chunky"
  // a sombra fica atrás da face, e um fundo translúcido a deixaria aparecer.
  blue950_40: '#171d2f',
  blue950_60: 'rgba(23,37,84,0.6)',
  purple100: '#f3e8ff',
  purple200: '#e9d5ff',
  purple300: '#d8b4fe',
  purple600: '#9333ea',
  purple900: '#581c87',
  purple950_60: 'rgba(59,7,100,0.6)',
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green300: '#86efac',
  green400: '#4ade80',
  green500: '#22c55e',
  green600: '#16a34a',
  green700: '#15803d',
  green800: '#166534',
  green900: '#14532d',
  green950_40: '#102017', // `green-950/40` sobre o gray-900, pelo mesmo motivo
  green950_60: 'rgba(5,46,22,0.6)',
  orange50: '#fff7ed',
  orange100: '#ffedd5',
  orange200: '#fed7aa',
  orange300: '#fdba74',
  orange400: '#fb923c',
  orange500: '#f97316',
  orange600: '#ea580c',
  orange900: '#7c2d12',
  orange950_50: 'rgba(67,20,7,0.5)',
  orange950_60: 'rgba(67,20,7,0.6)',
  pink100: '#fce7f3',
  pink200: '#fbcfe8',
  pink300: '#f9a8d4',
  pink500: '#ec4899',
  pink600: '#db2777',
  pink900: '#831843',
  pink950_60: 'rgba(80,7,36,0.6)',
  red100: '#fee2e2',
  red300: '#fca5a5',
  red500: '#ef4444',
  red600: '#dc2626',
  red950_60: 'rgba(69,10,10,0.6)',
  /** Sombra "chunky" escura de todos os cartões no modo escuro. */
  shadowDark: '#0f0f0f',
} as const;

export type Tint = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'red';

/** Quadradinho do ícone: `bg-X-100 text-X-600 dark:bg-X-950/60 dark:text-X-300`. */
const TINTS: Record<Tint, { light: { bg: string; fg: string }; dark: { bg: string; fg: string } }> = {
  blue: { light: { bg: tw.blue100, fg: tw.blue600 }, dark: { bg: tw.blue950_60, fg: tw.blue300 } },
  purple: { light: { bg: tw.purple100, fg: tw.purple600 }, dark: { bg: tw.purple950_60, fg: tw.purple300 } },
  green: { light: { bg: tw.green100, fg: tw.green600 }, dark: { bg: tw.green950_60, fg: tw.green300 } },
  orange: { light: { bg: tw.orange100, fg: tw.orange600 }, dark: { bg: tw.orange950_60, fg: tw.orange300 } },
  pink: { light: { bg: tw.pink100, fg: tw.pink600 }, dark: { bg: tw.pink950_60, fg: tw.pink300 } },
  red: { light: { bg: tw.red100, fg: tw.red600 }, dark: { bg: tw.red950_60, fg: tw.red300 } },
};

export function tint(name: string, isDark: boolean) {
  const t = TINTS[(name as Tint) in TINTS ? (name as Tint) : 'blue'];
  return isDark ? t.dark : t.light;
}

/**
 * O mesmo quadradinho, mas opaco no escuro (`950/60` composto sobre o gray-900
 * da página), para as peças que têm sombra sólida atrás (tela do avatar).
 */
const OPAQUE_DARK_BG: Record<Tint, string> = {
  blue: '#171f3c',
  purple: '#2d0d45',
  green: '#0c2516',
  orange: '#31150d',
  pink: '#390d1f',
  red: '#330f0f',
};

export function opaqueTint(name: string, isDark: boolean) {
  const t = tint(name, isDark);
  return isDark ? { ...t, bg: OPAQUE_DARK_BG[(name as Tint) in OPAQUE_DARK_BG ? (name as Tint) : 'blue'] } : t;
}

/** Fundo, texto e bordas da página, como `bg-white dark:bg-gray-900` etc. */
export function obTheme(isDark: boolean) {
  return {
    page: isDark ? colors.gray[900] : '#ffffff',
    text: isDark ? colors.gray[100] : colors.gray[900],
    muted: isDark ? colors.gray[400] : colors.gray[500],
    faint: colors.gray[400],
    card: isDark ? colors.gray[800] : '#ffffff',
    border: isDark ? colors.gray[700] : colors.gray[200],
    hairline: isDark ? colors.gray[800] : colors.gray[100],
    track: isDark ? colors.gray[800] : colors.gray[100],
    shadow: isDark ? tw.shadowDark : colors.gray[200],
    pressBg: isDark ? colors.gray[800] : colors.gray[100],
  };
}

export type ObTheme = ReturnType<typeof obTheme>;

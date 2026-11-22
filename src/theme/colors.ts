export const colors = {
  // Cinzas quentes do tom papel (20/11/2026), os mesmos do tailwind.config.js do web: o 50 é o
  // fundo de papel, o 100 o fundo suave, o 200 o contorno, o 800 a tinta e o 900 o fundo escuro.
  gray: {
    50: '#f8f6f1',
    100: '#efebe3',
    200: '#e4ded2',
    300: '#d3ccbe',
    400: '#a8a297',
    500: '#78726a',
    600: '#5a554d',
    700: '#47433c',
    800: '#2b2925',
    900: '#1b1a17',
    950: '#12110f',
  },

  // Game accent colors
  green: { 50: '#f0fdf4', 100: '#dcfce7', 300: '#86efac', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 900: '#14532d' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#7dd3fc', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' },
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7c3aed', 900: '#581c87' },
  red: { 50: '#fff1f2', 100: '#ffe4e6', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
  yellow: { 50: '#fefce8', 100: '#fef9c3', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207' },
  pink: { 50: '#fdf2f8', 100: '#fce7f3', 500: '#ec4899', 900: '#831843' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 900: '#78350f' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 900: '#7c2d12' },

  // Semânticas do tom papel (as variáveis do shadcn em resources/css/app.css do web)
  background: '#f8f6f1',
  foreground: '#2b2925',
  card: '#fffdf8',
  border: '#e4ded2',
  muted: '#efebe3',
  mutedForeground: '#78726a',
  primary: '#efc12f',
  primaryForeground: '#332800',

  dark: {
    background: '#1b1a17',
    foreground: '#eeebe4',
    card: '#24221f',
    border: '#3d3a34',
    muted: '#2d2b27',
    mutedForeground: '#a6a096',
  },

  // Família de botões, escolhas e avisos: as --mz-* de resources/css/app.css do web.
  // Ver docs/design/componentes.html no projeto web.
  family: {
    light: {
      face: '#fffdf8',
      ink: '#2b2925',
      ink2: '#47433c',
      muted: '#78726a',
      line: '#e4ded2',
      edge: '#e4ded2',
      tint: '#efebe3',
      tint2: '#e6e1d6',
      off: '#ebe7df',
      offInk: '#a8a297',
      offEdge: '#dcd6ca',
      brandSoft: '#f6ecc8',
      brandSoft2: '#f0dfa6',
      brandSoftInk: '#5e4800',
      brandMark: '#f3d873',
      dangerSoft: '#f5e2df',
      dangerSoft2: '#edd0cb',
      dangerSoftInk: '#993a32',
      choice: '#87a5d8',
      choiceSoft: '#edf1f8',
      choiceInk: '#3c5f9e',
      ok: '#86c39c',
      okSoft: '#edf5ef',
      okInk: '#2e7348',
      bad: '#e1928a',
      badSoft: '#f9edeb',
      badInk: '#a8423a',
      press: 'rgba(0,0,0,0.08)',
      // XP (azul) e Plus (magenta), em texto: a barra do topo e o combo de quem assina
      xpInk: '#1d4ed8',
      plusInk: '#b8306f',
    },
    dark: {
      face: '#282622',
      ink: '#eeebe4',
      ink2: '#d3cfc6',
      muted: '#a6a096',
      line: '#3d3a34',
      edge: '#3d3a34',
      tint: '#2d2b27',
      tint2: '#37342f',
      off: '#312f2a',
      offInk: '#77726a',
      offEdge: '#1d1c19',
      brandSoft: '#3a3214',
      brandSoft2: '#4a4019',
      brandSoftInk: '#f1dc95',
      brandMark: '#7c6522',
      dangerSoft: '#3a1c19',
      dangerSoft2: '#4a2420',
      dangerSoftInk: '#efb0a8',
      choice: '#6f8fc7',
      choiceSoft: '#1c2537',
      choiceInk: '#b3c7ea',
      ok: '#3f7d55',
      okSoft: '#16261c',
      okInk: '#a6d9b7',
      bad: '#8f4a44',
      badSoft: '#2e1a18',
      badInk: '#efb0a8',
      press: 'rgba(0,0,0,0.35)',
      xpInk: '#7db3ff',
      plusInk: '#f3a3cb',
    },
    // Iguais nos dois temas
    brand: '#efc12f',
    brandEdge: '#b38c17',
    brandHover: '#f5cc4a',
    brandInk: '#332800',
    danger: '#c0473e',
    dangerEdge: '#8e322b',
    success: '#2b8a52',
    successEdge: '#1d5f38',
    premium: '#8b5cc7',
    premiumEdge: '#643f96',
    // O XP é azul (contador do topo, raio do combo de quem assina) e o Plus é magenta (o
    // convite e o selo do topo). Igual a --mz-xp e --mz-plus da web
    xp: '#3b82f6',
    xpEdge: '#1d4ed8',
    xpLight: '#7db3ff',
    plus: '#d6438d',
    plusEdge: '#9c2a62',
  },

  // Game-specific
  game: {
    phaseComplete: '#22c55e',
    phaseCurrent: '#3b82f6',
    phaseReview: '#a855f7',
    phaseReviewCurrent: '#9333ea',
    phasePending: '#eab308',
    phaseLocked: '#a3a3a3',
    segmentCorrect: '#22c55e',
    segmentIncorrect: '#ef4444',
    segmentPending: 'transparent',
    // Lacuna (preencher) — paridade com web Tailwind yellow-100/700
    lacunaEmptyBg: '#fffbcd',
    lacunaEmptyText: '#8e7e26',
    lacunaEmptyBgDark: '#242424',
    lacunaEmptyTextDark: '#fffbcd',
    lacunaCorrectBg: 'rgba(220,252,231,0.6)', // green-100/60
    lacunaWrongBg: 'rgba(254,226,226,0.6)',   // red-100/60
  },
} as const;

export type Colors = typeof colors;

export type FamilyTokens = { [K in keyof (typeof colors.family)['light']]: string };

/** Tokens da família no tema atual. */
export function familyTokens(isDark: boolean): FamilyTokens {
  return isDark ? colors.family.dark : colors.family.light;
}

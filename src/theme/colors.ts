export const colors = {
  // Grays (neutral, sem tom azulado — idêntico ao tailwind.config.js do web)
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Game accent colors
  green: { 50: '#f0fdf4', 100: '#dcfce7', 300: '#86efac', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 900: '#14532d' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#7dd3fc', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' },
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7c3aed', 900: '#581c87' },
  red: { 50: '#fff1f2', 100: '#ffe4e6', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
  yellow: { 50: '#fefce8', 100: '#fef9c3', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207' },
  pink: { 50: '#fdf2f8', 100: '#fce7f3', 500: '#ec4899', 900: '#831843' },

  // Semantic (light mode)
  background: '#ffffff',
  foreground: '#0a0a0a',
  card: '#ffffff',
  border: '#e5e5e5',
  muted: '#f5f5f5',
  mutedForeground: '#737373',
  primary: '#171717',
  primaryForeground: '#fafafa',

  // Dark mode equivalents
  dark: {
    background: '#0a0a0a',
    foreground: '#fafafa',
    card: '#171717',
    border: '#262626',
    muted: '#171717',
    mutedForeground: '#a3a3a3',
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

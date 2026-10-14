import type { AvatarConfig } from '../avatar';

/**
 * Personagens fictícios da landing, montados com o editor de avatar do app.
 * O ranking e a prova social do hero usam os mesmos rostos.
 *
 * Cópia de `resources/js/components/landing/demoAvatars.ts` da web (só o
 * import muda). O onboarding usa o "Você" como guia e roda todos na tela do
 * avatar, como no site.
 */

const base = {
  brows: 'reta',
  earrings: 'nenhum',
  glasses: 'nenhum',
  beard: 'nenhum',
  outfit: 'nenhum',
  earringColor: '#F2C219',
  glassesColor: '#2B2440',
} as const;

export const DEMO_AVATARS: Record<string, Partial<AvatarConfig>> = {
  Marina: {
    ...base,
    body: 'magro',
    hair: 'comprido',
    brows: 'cilios',
    mouth: 'sorriso',
    earrings: 'argola',
    skin: '#C6694E',
    hairColor: '#241F1F',
    clothesColor: '#C2455F',
    background: '#F0AE3E',
  },
  Rafael: {
    ...base,
    body: 'gordo',
    hair: 'curto',
    mouth: 'aberta',
    beard: 'grossa',
    skin: '#F0B489',
    hairColor: '#3A2C22',
    clothesColor: '#3D4A7A',
    background: '#6EC6BF',
  },
  Júlia: {
    ...base,
    body: 'magro',
    hair: 'chanel',
    brows: 'arqueada',
    mouth: 'sorriso',
    glasses: 'grau',
    skin: '#FBDCC2',
    hairColor: '#C4562E',
    clothesColor: '#2A9D8F',
    background: '#C9B6E8',
  },
  Você: {
    ...base,
    body: 'magro',
    hair: 'afro',
    mouth: 'aberta',
    outfit: 'toga',
    skin: '#8C4633',
    hairColor: '#241F1F',
    clothesColor: '#2B2440',
    background: '#B9E38A',
  },
  Pedro: {
    ...base,
    body: 'magro',
    hair: 'liso',
    mouth: 'sorriso',
    glasses: 'sol',
    skin: '#EFC09A',
    hairColor: '#5C4331',
    clothesColor: '#E8894A',
    background: '#3FA0DE',
  },
};

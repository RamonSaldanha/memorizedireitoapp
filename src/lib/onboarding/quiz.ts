/**
 * Conteúdo do onboarding: perguntas, alternativas e como cada resposta vira
 * a trilha (seleção de legislações) e o artigo do desafio.
 *
 * As legislações são achadas pelo título, não por id: os ids mudam entre
 * ambientes e o título é o que o admin vê. Lei que não existir publicada
 * simplesmente fica de fora.
 */

export type Goal = 'oab' | 'concurso' | 'faculdade' | 'profissao' | 'pessoal';
export type Area = 'constitucional' | 'penal' | 'civil' | 'trabalho' | 'administrativo' | 'indica';
export type Minutes = 5 | 15 | 30 | 60;

type LawKey = 'cf' | 'cc' | 'cpc' | 'cp' | 'cpp' | 'lindb' | 'improbidade' | 'clt' | 'servidores' | 'lep' | 'oab' | 'ctn' | 'cdc';

export interface Option<T> {
    value: T;
    title: string;
    caption: string;
    /** Nome do ícone (lucide), resolvido na página. */
    icon: string;
    /** Cor do quadradinho do ícone. */
    tint: string;
}

export const GOALS: Option<Goal>[] = [
    { value: 'oab', title: 'Passar na OAB', caption: 'Exame de Ordem', icon: 'Scale', tint: 'blue' },
    { value: 'concurso', title: 'Passar em concurso', caption: 'Carreiras públicas', icon: 'Landmark', tint: 'purple' },
    { value: 'faculdade', title: 'Ir bem na faculdade', caption: 'Provas e seminários', icon: 'GraduationCap', tint: 'green' },
    { value: 'profissao', title: 'Me atualizar na profissão', caption: 'Para quem já atua', icon: 'Briefcase', tint: 'orange' },
    { value: 'pessoal', title: 'Satisfação pessoal', caption: 'Conhecer meus direitos', icon: 'Sparkles', tint: 'pink' },
];

export const AREAS: Option<Area>[] = [
    { value: 'constitucional', title: 'Constitucional', caption: 'Direitos e garantias', icon: 'ScrollText', tint: 'blue' },
    { value: 'penal', title: 'Penal', caption: 'Crimes, penas e processo', icon: 'Gavel', tint: 'red' },
    { value: 'civil', title: 'Civil', caption: 'Pessoas, contratos e processo', icon: 'Users', tint: 'green' },
    { value: 'trabalho', title: 'Trabalho', caption: 'Empregado e empregador', icon: 'HardHat', tint: 'orange' },
    {
        value: 'administrativo',
        title: 'Administrativo e tributário',
        caption: 'Servidores, improbidade, tributos',
        icon: 'Building2',
        tint: 'purple',
    },
    { value: 'indica', title: 'Me indica uma', caption: 'A gente escolhe por você', icon: 'Wand2', tint: 'pink' },
];

export const MINUTES: (Option<Minutes> & { bars: number })[] = [
    { value: 5, title: '5 min por dia', caption: 'Leve: cabe no intervalo', icon: 'Coffee', tint: 'green', bars: 1 },
    { value: 15, title: '15 min por dia', caption: 'Firme: uma rotina de verdade', icon: 'Timer', tint: 'blue', bars: 2 },
    { value: 30, title: '30 min por dia', caption: 'Puxado: ritmo de prova', icon: 'Flame', tint: 'orange', bars: 3 },
    { value: 60, title: '1 hora por dia', caption: 'Intenso: modo maratona', icon: 'Rocket', tint: 'red', bars: 4 },
];

const LAW_PATTERNS: Record<LawKey, RegExp> = {
    cf: /constituicao federal/,
    cc: /^codigo civil/,
    cpc: /processo civil/,
    cp: /^codigo penal/,
    cpp: /processo penal/,
    lindb: /introducao as normas/,
    improbidade: /improbidade/,
    clt: /leis do trabalho/,
    servidores: /servidores publicos/,
    lep: /execuc(ao|oes) penal/,
    oab: /estatuto da (oab|advocacia)/,
    ctn: /tributario nacional/,
    cdc: /defesa do consumidor/,
};

/** Base da trilha pelo objetivo. */
const GOAL_LAWS: Record<Goal, LawKey[]> = {
    oab: ['oab', 'cf', 'cc', 'cp', 'cpc', 'cpp'],
    concurso: ['cf', 'servidores', 'improbidade', 'cp', 'cpp'],
    faculdade: ['cf', 'cc', 'cp', 'lindb'],
    profissao: ['cf', 'cc', 'cpc', 'clt'],
    pessoal: ['cf', 'cdc', 'cc', 'cp'],
};

/** Leis da área escolhida entram antes da base. */
const AREA_LAWS: Record<Area, LawKey[]> = {
    constitucional: ['cf'],
    penal: ['cp', 'cpp', 'lep'],
    civil: ['cc', 'cpc', 'lindb'],
    trabalho: ['clt'],
    administrativo: ['improbidade', 'servidores', 'ctn'],
    indica: [],
};

/** Trilha enxuta: com mais que isso a pessoa demora a ver progresso em cada lei. */
export const MAX_TRAIL = 5;

export interface LegislationOption {
    id: number;
    title: string;
}

function normalize(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Ids das legislações sugeridas, na ordem de importância. */
export function suggestTrail(goal: Goal, area: Area, legislations: LegislationOption[]): number[] {
    const keys = [...new Set([...AREA_LAWS[area], ...GOAL_LAWS[goal]])];
    const ids: number[] = [];

    for (const key of keys) {
        const found = legislations.find((l) => LAW_PATTERNS[key].test(normalize(l.title)));
        if (found && !ids.includes(found.id)) ids.push(found.id);
        if (ids.length === MAX_TRAIL) break;
    }

    // Nenhuma lei bateu (ambiente com outros títulos): começa pelas primeiras.
    return ids.length ? ids : legislations.slice(0, 4).map((l) => l.id);
}

export interface ChallengeArticle {
    law: string;
    /** Marcador em negrito antes do texto, como no jogo ("Art. 5º"). */
    ref: string;
    /** Texto completo, sem o marcador. */
    text: string;
    /**
     * Palavras do texto que viram lacuna, na ordem em que aparecem. Duas, e o
     * banco só tem um distrator óbvio: o desafio é para sentir o jogo, não para travar.
     */
    gaps: string[];
    /** Respostas + distratores, na ordem do banco. */
    bank: string[];
}

const CHALLENGES: Record<Exclude<Area, 'indica'>, ChallengeArticle> = {
    constitucional: {
        law: 'Constituição Federal',
        ref: 'Art. 5º',
        text: 'Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade.',
        gaps: ['iguais', 'distinção'],
        bank: ['distinção', 'culpados', 'iguais'],
    },
    penal: {
        law: 'Código Penal',
        ref: 'Art. 121',
        text: 'Matar alguém: Pena – reclusão, de seis a vinte anos.',
        gaps: ['Matar', 'seis'],
        bank: ['seis', 'Elogiar', 'Matar'],
    },
    civil: {
        law: 'Código Civil',
        ref: 'Art. 1º',
        text: 'Toda pessoa é capaz de direitos e deveres na ordem civil.',
        gaps: ['capaz', 'deveres'],
        bank: ['deveres', 'proibida', 'capaz'],
    },
    trabalho: {
        law: 'Consolidação das Leis do Trabalho',
        ref: 'Art. 3º',
        text: 'Considera-se empregado toda pessoa física que prestar serviços de natureza não eventual a empregador, sob a dependência deste e mediante salário.',
        gaps: ['física', 'dependência'],
        bank: ['dependência', 'imaginária', 'física'],
    },
    administrativo: {
        law: 'Regime Jurídico dos Servidores Públicos',
        ref: 'Art. 2º',
        text: 'Para os efeitos desta Lei, servidor é a pessoa legalmente investida em cargo público.',
        gaps: ['servidor', 'cargo'],
        bank: ['cargo', 'turista', 'servidor'],
    },
};

/** "Me indica" cai no artigo mais conhecido do objetivo escolhido. */
const GOAL_CHALLENGE: Record<Goal, Exclude<Area, 'indica'>> = {
    oab: 'constitucional',
    concurso: 'administrativo',
    faculdade: 'civil',
    profissao: 'civil',
    pessoal: 'constitucional',
};

export function challengeFor(goal: Goal, area: Area): ChallengeArticle {
    return CHALLENGES[area === 'indica' ? GOAL_CHALLENGE[goal] : area];
}

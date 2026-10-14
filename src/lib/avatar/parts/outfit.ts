/**
 * Fantasias: cobrem o corpo inteiro, como skin de jogo.
 *
 * Cada fantasia sai em até três partes (`OutfitLayers`):
 *
 *   body    desenhada **no lugar da roupa**, na mesma camada: depois do pescoço
 *           e da massa do cabelo, antes do brinco e da cabeça. Assim o cabelo
 *           comprido continua caindo por trás, e a barba e o queixo passam por
 *           cima da gola.
 *   top     desenhada por cima de tudo.
 *   helmet  capacete: a cabeça inteira é desenhada menor, dentro do visor, e
 *           recortada por ele — ver `render.ts`.
 *   fit     encaixe da cena inteira — cabeça e fantasia juntas —, para a
 *           fantasia caber como na referência.
 *
 * Cada fantasia é decalcada de uma imagem de referência. Como a roupa não é
 * desenhada por baixo, o corpo escolhido só muda a largura — e só onde a
 * fantasia encosta no pescoço, que é mais grosso no corpo gordo.
 */

import { roundedRect } from '../geometry';
import type { BodyShape, OutfitStyle } from '../types';
import { both } from './svg';

export interface HelmetLayers {
    /** Vidro do visor, desenhado atrás da cabeça. */
    glass: string;
    /** Formato do visor: recorta a cabeça. */
    clip: string;
    /** Encaixa a cabeça, menor, dentro do visor. */
    transform: string;
}

export interface OutfitLayers {
    body: string;
    top: string;
    helmet?: HelmetLayers;
    /** Transformação aplicada à cena inteira, menos o fundo. */
    fit?: string;
    /**
     * Topo do corpo da fantasia, onde ele encontra o pescoço. A animação do
     * editor usa para amassar o corpo na medida da cabeça (ver `render.ts`).
     */
    neckline?: number;
}

const NONE: OutfitLayers = { body: '', top: '' };

/*
 * Toga de juiz, **decalcada da imagem de referência** (1254x1254).
 *
 * A referência é o próprio avatar, de corpo magro: na escala 94/538 — a
 * largura do rosto de lá vira a da cabeça daqui —, com o queixo em y 152, o
 * pescoço de lá dá os mesmos 34 de largura e as orelhas caem no lugar. As
 * peças abaixo estão nessa escala, na grade normal do avatar, centradas em
 * x 100; o lado direito é o esquerdo espelhado.
 *
 * Nessa grade a toga passa do fundo da tela: o peitilho termina em y 196 e a
 * barra, em y 227. Por isso a cena inteira encolhe para 91,3% — a escala da
 * referência inteira — e sobe (`fit`), com o queixo em y 138. Lá o queixo fica
 * em y 133,7; aqui ele desce 4,3 porque a nossa cabeça é mais alta que a de lá,
 * e o cabelo mais alto (comprido e chanel, y 2,4 e 2,6 na grade normal) sairia pelo
 * topo. Tudo que a cabeça desenha até y 200 continua escondido: o pescoço fica
 * atrás do manto e a massa do cabelo comprido segue até y 232.
 */
const ROBE = '#242224';
/** Pregas, costuras e lapelas: o mesmo preto, um tom abaixo. */
const ROBE_SHADE = '#151414';
const COLLAR_WHITE = '#F3F3F4';
/** O peitilho é mais branco que a gola, e o nó no alto dele, mais cinza. */
const BANDS_WHITE = '#FDFDFD';
const KNOT_GRAY = '#E7E7E7';
const WEDGE_GRAY = '#CFCDD1';

/**
 * Manto: do ombro, que desce reto da gola, até a manga bufante, que cai até a
 * barra. Em cima o contorno fecha por baixo da gola e do nó.
 */
const ROBE_OUTLINE =
    'M100,167.2L79.5,161.6C71.6,164.5 63.6,167.8 56.4,171.9C44.8,171.2 35.7,187.5 32.3,196.6C28.3,206.7 26.7,216.8 25,227.5H175C173.3,216.8 171.7,206.7 167.7,196.6C164.3,187.5 155.2,171.2 143.6,171.9C136.4,167.8 128.4,164.5 120.5,161.6Z';

/*
 * Peças do lado esquerdo. Na manga, uma cunha escura nasce no ombro e se abre
 * em duas: a linha de fora e a costura de dentro. A pala termina numa costura
 * quase reta, de onde desce a prega. A lapela acompanha o peitilho e continua
 * por baixo dele até o filete claro do meio, que só aparece abaixo do peitilho.
 */
const SLEEVE =
    'M55.9,173.7C49.9,177.1 47.2,186.5 44.7,192.5C41.1,204 38.9,215.6 37.1,227.5H38.6C41.3,212.9 44.4,190.3 55.2,179.4L56.2,178.8L57.3,179.6C54.2,195.2 54.4,211.6 54.3,227.5H56.3C57.6,215.1 58.4,203 61.3,190.8C62.9,186.1 57.9,177.8 55.9,173.7Z';
const YOKE_SEAM = 'M88,181.6L56.6,185.6L57.5,191.1H61.3Q61.6,187.8 63.7,187.4L67.2,186.8L66.4,227.5H74.1L74.4,185.3L88.4,183.9Z';
const LAPEL = 'M89.4,175.9L85.9,181.7L88.4,184.1V227.5H98.2V171.6Z';
/** Cunha cinza entre a aba da gola, o peitilho e a lapela. Passa por baixo dos dois primeiros. */
const WEDGE = 'M89.4,175.6L93.1,178.4L96.2,178.4L96.2,167.2L93.3,165.5L87.2,171.6Z';
/** Aba da gola: abraça o pescoço (a quina de cima fica em x 82,8) e termina em ponta sobre a lapela. */
const COLLAR_WING = 'M82.8,157.4C75.8,163 85.6,171.2 89.3,175.6C91.5,172.3 94.3,167.1 98.2,165.6C95.3,162.5 86.9,159.3 82.8,157.4Z';

/** Peitilho: trapézio de lados retos e cantos de baixo arredondados. O topo fica sob o nó. */
const BANDS = 'M95.4,168H104.6L109.8,195.8Q109.9,196.3 108.5,196.3H91.5Q90.1,196.3 90.2,195.8Z';
/** Nó: cúpula que cobre o encontro das abas da gola, no alto do peitilho. */
const KNOT = 'M95,168.1C95,166.4 97.2,165.5 100,165.5C102.8,165.5 105,166.4 105,168.1C103.5,168.8 96.5,168.8 95,168.1Z';

/**
 * No corpo gordo o pescoço tem 42 em vez de 34: a toga inteira alarga na
 * mesma proporção (1,235) em torno de x 100, e a gola continua abraçando o
 * pescoço.
 */
const WIDEN_FOR_GORDO = 'matrix(1.235,0,0,1,-23.5,0)';

/** A escala da referência inteira (200/1254) sobre a das peças (94/538), em torno do queixo. */
const TOGA_FIT = 'translate(100,138) scale(0.913) translate(-100,-152)';

function toga(body: BodyShape): OutfitLayers {
    const robe =
        `<path d="${ROBE_OUTLINE}" fill="${ROBE}"/>` +
        both(`<path d="${SLEEVE}" fill="${ROBE_SHADE}"/><path d="${YOKE_SEAM}" fill="${ROBE_SHADE}"/><path d="${LAPEL}" fill="${ROBE_SHADE}"/>`) +
        both(`<path d="${WEDGE}" fill="${WEDGE_GRAY}"/>`) +
        both(`<path d="${COLLAR_WING}" fill="${COLLAR_WHITE}"/>`) +
        `<path d="${BANDS}" fill="${BANDS_WHITE}"/>` +
        `<path d="${KNOT}" fill="${KNOT_GRAY}"/>`;

    return {
        body: body === 'gordo' ? `<g transform="${WIDEN_FOR_GORDO}">${robe}</g>` : robe,
        top: '',
        fit: TOGA_FIT,
        // A quina de cima da aba da gola.
        neckline: 157.4,
    };
}

/*
 * Astronauta, **decalcado da imagem de referência** (1254x1254).
 *
 * A composição de lá cabe inteira nesta tela numa escala só (200/1254),
 * centrada em x 100. Cada contorno abaixo foi ajustado aos pixels de lá, e as
 * peças dos dois lados são desenhadas uma vez só, à esquerda, e espelhadas.
 *
 * Como na referência, a **cabeça inteira** aparece pelo visor — cabelo e orelha
 * inclusive. Ela é desenhada a 80% do tamanho, com o queixo na altura do de lá,
 * e recortada pelo visor: é isso que segura o cabelo comprido dentro do vidro.
 */
const WHITE = '#FCFCFC';
/** Aro do visor, faixa das peças laterais e costuras do traje. */
const RIM = '#D4D7DD';
/** Frente da gola e miolo do painel: um branco acinzentado, para destacar do traje. */
const PALE = '#F2F3F5';
const COLLAR_SHADOW = '#B6BAC3';
const PANEL = '#BFC4CC';
/** Abertura da gola e alças. */
const SLATE = '#5E6372';
const CLIP = '#3C3F47';
const BAR = '#8F94A0';
const BLUE = '#016BED';
/** Ponta da faixa do ombro e metade de baixo da bola do painel. */
const BLUE_SHADE = '#0059D8';
const GLASS = '#1E3E79';
const GLASS_BEVEL = '#2F4F8A';
const GLASS_SHINE = '#C9D2E9';
const GLASS_GLINT = '#4F6C9F';
/** Os três botões do painel, na ordem da referência. */
const BUTTONS = ['#DE1D22', '#FCAF0F', '#28A743'];

/*
 * Capacete: casca, aro e visor, cada um uma forma de quatro quadrantes. A casca
 * é oval — sobe mais que um círculo da mesma largura — e achatada embaixo, onde
 * assenta na gola. A borda branca em volta do aro é grossa em cima (8,6), fina
 * nos lados e média embaixo (5,7).
 */
const SHELL =
    'M100,6.9C144.1,6.9 172.2,41.4 172.2,84.3C172.2,127.5 151.2,147.6 100,147.6C48.8,147.6 27.8,127.5 27.8,84.3C27.8,41.4 55.9,6.9 100,6.9Z';
const RIM_OUTER =
    'M100,15.5C143.2,15.5 171.2,40.3 171.2,85.2C171.2,122.1 151.7,141.9 100,141.9C48.3,141.9 28.8,122.1 28.8,85.2C28.8,40.3 56.8,15.5 100,15.5Z';
const VISOR =
    'M100,18.8C147.4,18.8 168.4,48.1 168.4,84.1C168.4,123.1 147,138.9 100,138.9C53,138.9 31.6,123.1 31.6,84.1C31.6,48.1 52.6,18.8 100,18.8Z';

/**
 * Bisel: faixa mais clara na borda do vidro, larga à esquerda e embaixo à
 * direita, como na referência. A borda de fora passa por baixo do aro.
 */
const BEVEL =
    'M61.4,133.4C25.1,113.4 37.8,49.1 63.9,26.3L63,24.9C23,41.6 15.4,120.1 60.5,134.7Z' +
    'M167.2,69.7C159.7,98.6 159.6,117.8 132.1,135.4L133,136.8C166.5,128.1 173.3,100.1 168.8,69.4Z';

/** A cabeça a 80%, com o queixo (y 152) onde fica o de lá (y 137), logo acima da borda do visor. */
const HEAD_FIT = 'translate(100,137) scale(0.8) translate(-100,-152)';

/*
 * Gola: retângulo claro sobre uma sombra cinza que só aparece embaixo e nos
 * lados — é o que dá o volume. A abertura escura vem por cima e a casca do
 * capacete, depois, cobre a metade de cima dela: sobra a faixa escura entre o
 * capacete e a gola. Nos cantos de cima fica um vão, onde o fundo aparece.
 */
const COLLAR_BACK =
    'M47.6,147.7H152.4C153.8,147.7 154.4,148.3 154.4,149.3C154.4,166.1 108.7,164.4 100,164.4' +
    'C91.3,164.4 45.6,166.1 45.6,149.3C45.6,148.3 46.2,147.7 47.6,147.7Z';
const COLLAR =
    'M52.2,139.1H147.8C150.6,139.1 152.6,141.4 152.6,144.2V148.3C152.6,163.1 111.3,162 100,162' +
    'C88.7,162 47.4,163.1 47.4,148.3V144.2C47.4,141.4 49.4,139.1 52.2,139.1Z';
const COLLAR_OPENING = 'M53.1,136.5H146.9V141.2C146.9,151.1 104.1,152 100,152C95.9,152 53.1,151.1 53.1,141.2Z';

/**
 * Traje: a borda de cada braço é uma curva só, do ombro — que nasce por baixo
 * da gola — até o pé. Em cima, o contorno fecha por baixo da gola, onde não
 * aparece.
 */
const SUIT = 'M5.6,200.3L6.2,197.8C11.6,177.4 21.6,155.3 44.2,148.6L49,147.5H151L155.8,148.6C178.4,155.3 188.4,177.4 193.8,197.8L194.4,200.3Z';

/*
 * Braço esquerdo; o direito sai espelhado. A faixa azul começa na borda do
 * ombro — o trecho de lá é o mesmo pedaço da curva da borda — e termina em
 * ponta arredondada, com o fim um tom mais escuro. Duas linhas de gomo cruzam
 * a manga, saindo da borda, e a costura desce da ponta da alça até o pé,
 * separando braço e tronco: a de cima termina dentro dela.
 */
const STRIPE =
    'M31.2,154.9C28.4,156.9 25.8,159.3 23.5,161.8C32.7,160 42.1,176 44,183.3C44.2,193.3 51.5,184.5 48.3,178.5C46.6,169.8 40.5,157.4 31.2,154.9Z';
const STRIPE_END = 'M44,183.3C44.2,193.3 51.5,184.5 48.3,178.5Z';
const SLEEVE_LINES = 'M18.3,168.7L23.5,171.3C31.1,175.1 38.3,183.8 42.1,191.4L45,197.2M9.2,187.8L21.1,192.3C25.3,193.9 29,196.2 32.5,199L34.8,200.9';
const SEAM = 'M56.5,176.1L54.3,179.9C50.9,188.4 44.9,188.2 45.2,199V201';
const STRAP = 'M60.2,157L59.6,160.1C58.8,165.3 58.1,171.1 56.5,176.1';

/** Peça lateral do capacete: meia cápsula branca por fora, faixa cinza encostada no vidro. */
const POD = 'M31.6,68.6H30.2C21.9,68.6 20.6,81.3 20.6,87.4C20.6,93.5 21.9,106.2 30.2,106.2H31.6Z';

function astronaut(): OutfitLayers {
    const arm =
        `<path d="${STRIPE}" fill="${BLUE}"/>` +
        `<path d="${STRIPE_END}" fill="${BLUE_SHADE}"/>` +
        // Linhas de gomo com a ponta reta: o corte coincide com a borda do braço.
        `<path d="${SLEEVE_LINES}" fill="none" stroke="${RIM}" stroke-width="3"/>` +
        `<path d="${SEAM}" fill="none" stroke="${RIM}" stroke-width="3.3" stroke-linecap="round"/>` +
        `<path d="${STRAP}" fill="none" stroke="${SLATE}" stroke-width="4.7" stroke-linecap="round"/>` +
        `<path d="${roundedRect(67.6, 174.6, 4.9, 16.1, 2.2)}" fill="${CLIP}"/>`;

    const suit =
        `<path d="${SUIT}" fill="${WHITE}"/>` +
        both(arm) +
        // Painel do peito.
        `<path d="${roundedRect(72.5, 166.2, 55, 33.3, 6.6)}" fill="${PANEL}"/>` +
        `<path d="${roundedRect(75.4, 169.1, 49.2, 27.6, 3.9)}" fill="${PALE}"/>` +
        `<circle cx="87.4" cy="180.5" r="7.1" fill="${BLUE}"/>` +
        `<path d="M80.3,180.6A7.1,7.1 0 0 0 94.5,180.6Z" fill="${BLUE_SHADE}"/>` +
        `<path d="${roundedRect(100.4, 173.4, 20.6, 4.8, 2.4)}" fill="${BAR}"/>` +
        `<path d="${roundedRect(100.4, 180.4, 20.6, 4.8, 2.4)}" fill="${BAR}"/>` +
        BUTTONS.map((color, i) => `<circle cx="${103.1 + i * 7.5}" cy="190.7" r="2.8" fill="${color}"/>`).join('');

    const top =
        `<path d="${COLLAR_BACK}" fill="${COLLAR_SHADOW}"/>` +
        `<path d="${COLLAR}" fill="${PALE}"/>` +
        `<path d="${COLLAR_OPENING}" fill="${SLATE}"/>` +
        `<path d="${SHELL + RIM_OUTER}" fill="${WHITE}" fill-rule="evenodd"/>` +
        `<path d="${RIM_OUTER + VISOR}" fill="${RIM}" fill-rule="evenodd"/>` +
        // Reflexos no vidro, por cima da cabeça: a faixa clara no alto à esquerda, o ponto e o arco à direita.
        `<path d="M48,48.7C51.8,43.5 56.5,38.5 64.2,34.7" fill="none" stroke="${GLASS_SHINE}" stroke-width="6.5" stroke-linecap="round"/>` +
        `<ellipse cx="42.9" cy="58.2" rx="3.1" ry="4" transform="rotate(24.5 42.9 58.2)" fill="${GLASS_SHINE}"/>` +
        `<path d="M145.9,37.9C157.1,48.5 161.6,58 162,76.5" fill="none" stroke="${GLASS_GLINT}" stroke-width="5.1" stroke-linecap="round"/>` +
        both(
            `<path d="${POD}" fill="${WHITE}"/>` +
                `<path d="${roundedRect(30.2, 68.3, 4.4, 38.2, 2.1)}" fill="${RIM}"/>` +
                `<ellipse cx="23.8" cy="87.1" rx="2.1" ry="6.3" fill="${BLUE}"/>`,
        );

    return {
        body: suit,
        top,
        helmet: {
            glass: `<path d="${VISOR}" fill="${GLASS}"/><path d="${BEVEL}" fill="${GLASS_BEVEL}"/>`,
            clip: VISOR,
            transform: HEAD_FIT,
        },
    };
}

/** A fantasia vestida, ou nada quando não há nenhuma — aí a roupa aparece. */
export function outfit(style: OutfitStyle, body: BodyShape): OutfitLayers {
    if (style === 'toga') {
        return toga(body);
    }

    if (style === 'astronauta') {
        return astronaut();
    }

    return NONE;
}

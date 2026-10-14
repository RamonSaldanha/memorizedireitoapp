/**
 * Cabelo.
 *
 * Sete cortes, cada um com a sua própria lógica de camada:
 *
 *   comprido  sai em **duas** camadas. A massa (`back`) é maciça e vai antes do
 *             pescoço e da roupa, então a gola passa por cima dela — é o cabelo
 *             cobrindo a nuca e saindo por trás da roupa. A cortina (`front`)
 *             cai sobre a testa e vai depois da cabeça, senão o rosto a cobre.
 *   liso      as mesmas duas camadas do comprido, com a massa reta dos lados.
 *   chanel    as mesmas duas camadas. A massa ondulada termina entre a boca e o
 *             queixo, antes de chegar à roupa, e a cortina é a franja com as
 *             mechas que descem pela lateral do rosto até o alto da orelha.
 *   curto     só `front`. Ele para no alto da orelha, então não existe nada
 *   afro      dele atrás do pescoço para desenhar. Vale para os três.
 *   calvo
 *   coque     só `front`, e as mechas passam por cima da orelha. É o único que
 *             mexe na cena: o coque não cabe acima da cabeça, então a cena
 *             inteira encolhe para ele caber (`fit`).
 *
 * Todos foram traçados a partir de imagens de referência, adaptados à grade
 * daqui — o rosto das referências é mais largo que alto e o daqui é o contrário
 * (94x132), então as curvas foram remapeadas em proporção da cabeça, não
 * copiadas em escala.
 *
 * O limite que vale para qualquer corte novo: **a franja não pode cortar a
 * sobrancelha ao meio**. A sobrancelha é desenhada depois do cabelo e na mesma
 * cor dele, então só existem dois jeitos certos:
 *
 *   parar acima da faixa dela (y 49..62), com a borda em y 46 no máximo — é o
 *   que o curto, o afro, o calvo, o comprido e o liso fazem. O coque e o
 *   chanel descem um pouco mais (o coque perto das pontas, onde a sobrancelha
 *   é mais baixa; o chanel na ponta da mecha da franja), mas ficam a pelo
 *   menos 2,2 de qualquer estilo dela: a mesma folga do liso e do afro;
 *
 *   descer abaixo dela e cobri-la inteira, a partir de y 63 — ela some na cor
 *   do cabelo.
 *
 * Borda no meio da faixa faz a parte de baixo da sobrancelha reaparecer grudada
 * na franja, o que lê como erro de camada. E nenhuma franja pode chegar ao olho
 * (y 68): ele também é desenhado depois e apareceria por cima do cabelo. As
 * referências não têm sobrancelha e deixam a franja cobrir o olho; aqui não dá.
 */

import { sheen } from '../color';
import type { HairStyle } from '../types';

export interface HairLayers {
    back: string;
    front: string;
    /**
     * Encaixe da cena inteira, para o corte caber na tela — hoje, só o coque.
     * A mesma ideia do `fit` das fantasias (ver `parts/outfit.ts`).
     */
    fit?: string;
}

const EMPTY: HairLayers = { back: '', front: '' };

/**
 * Coroa do comprido: dois lóbulos redondos, como na referência.
 * O esquerdo é maior e mais alto, com pico em (74,3); o direito tem pico em
 * (138,9), e o entalhe entre os dois fica em (112,14), fora do centro. Cada
 * lóbulo é quase um quarto de círculo: com raio muito diferente na horizontal e
 * na vertical, ele vira canto de caixa arredondado.
 *
 * Vai da lateral esquerda (30,52) à direita (172,48) passando por cima da
 * cabeça. A massa e a cortina começam por ela, então as duas camadas têm o
 * mesmo contorno de cima: não existe emenda entre elas, e nenhum canto do rosto
 * vaza no meio num risco de pele.
 *
 * No recorte redondo os lóbulos encostam no círculo inscrito e perdem no máximo
 * 1–3px.
 */
const CROWN = 'M30,52C33,24 52,5 74,3C90,1 104,4 112,14C117,10 126,9 138,9C156,9 170,24 172,48';

/**
 * Massa do comprido.
 *
 * O que dá a fluidez é a **tangente contínua em toda junção**: cada trecho sai
 * na mesma direção em que o anterior chegou, então a silhueta nunca quebra. A
 * única quina de propósito é o entalhe da coroa. A versão anterior tinha platôs
 * retos e aberturas bruscas, e lia como capacete.
 *
 * As laterais são uma onda só, quase espelhada; a assimetria fica na coroa.
 *
 *   bojo     x 12 / 188, em y≈105 — na altura da orelha, que aparece por cima
 *   cintura  x 31 / 169, em y≈155 — no queixo
 *   pé       x 6 / 194 — volta a abrir e sai pela borda do canvas
 *
 * O pé continua abrindo até y 232, fora da tela. Não aparece aqui, mas a toga
 * encolhe a cena inteira e traz esse trecho para dentro — ver `parts/outfit.ts`.
 *
 * No bojo e na cintura, o lado direito fica 2px abaixo do esquerdo: o bastante
 * para não sair como carimbo espelhado.
 *
 * No recorte redondo o bojo e a cintura ficam dentro do círculo, então a onda
 * sobrevive no avatar de 40px do header. Só a abertura do pé é cortada.
 */
const LONG_MASS =
    CROWN +
    'C174,72 188,86 188,106C188,130 169,134 169,156C169,174 188,184 194,200' +
    'L206,232H-6L6,200C12,184 31,174 31,154C31,132 12,128 12,104C12,84 28,76 30,52Z';

/**
 * Cortina do comprido: a parte do cabelo que cobre o alto da cabeça.
 *
 * A borda de baixo é a linha do cabelo, com a risca no meio e o vértice em
 * (100,23). Cada metade desce íngreme perto da risca, atravessa a testa em
 * y≈39–45 e desce pela lateral do rosto. É isso que faz as duas metades
 * parecerem cabelo caindo para os lados, não uma faixa. Sobre a sobrancelha
 * (x 62–85), o ponto mais baixo é y≈44,7, na ponta de fora — dentro do limite
 * de y 46.
 *
 * Nas laterais a cortina fecha por dentro da massa, onde a emenda é invisível,
 * e desce só até y 64. A orelha começa em 78 e aparece por cima do cabelo, então
 * a cortina não pode descer até ela.
 */
const LONG_CURTAIN =
    CROWN + 'L147,64C147,58 146,54 144,50C140,42 128,42 118,39C109,36 103,30 100,23' + 'C97,30 91,36 82,39C72,42 60,42 56,50C54,54 53,58 53,64Z';

/*
 * Chanel, **decalcado da silhueta de referência** (1254x1254, a mesma do SVG
 * que veio com ela) e posto no rosto pelo avatar de referência que mostra o
 * corte inteiro: um chanel ondulado, com a risca à direita do centro.
 *
 * A silhueta é o cabelo desse avatar (batem em 88% da área, na escala 0,905),
 * então as medidas vêm do rosto de lá. Na horizontal, a largura do rosto de lá
 * vira a daqui, e as mechas das laterais cobrem 3,7 da borda do rosto, como lá.
 * Na vertical o rosto daqui é mais comprido, então a silhueta foi presa às peças
 * dele: a ponta da mecha da franja logo acima do arco dos cílios, o alto e o pé
 * da orelha, e o queixo. Assim as pontas terminam onde terminam lá, a 77% do
 * caminho entre o pé da orelha e o queixo. Acima da franja a coroa foi achatada
 * 21%: na escala da silhueta ela passaria do topo da tela.
 *
 *   coroa    dois lóbulos, o esquerdo maior e mais alto (topo em y 2,6), com o
 *            entalhe em (119,4,12,9), acima da risca
 *   lados    ondulados: abrem até x 13,7 / 186,8 na altura da orelha, recolhem
 *            e terminam em pontas viradas para fora, em y 141,9
 *   franja   risca em (114,8,28,6). A metade esquerda atravessa a testa e desce
 *            numa mecha pontuda sobre a sobrancelha esquerda, com um pique de
 *            pele entre ela e a mecha da lateral
 *   mechas   da franja até o alto da orelha, cobrindo a borda do rosto
 *            (x 56,7 / 143,3), e viram para fora num cacho em cima dela
 *
 * O contorno de fora fica, em média, a 0,13 do da silhueta.
 */

/**
 * Coroa do chanel: do lado direito, em y 70, por cima dos dois lóbulos, até o
 * lado esquerdo na mesma altura. A massa e a franja começam por ela, então as
 * duas camadas se encaixam sem emenda.
 *
 * No recorte redondo o lóbulo direito encosta no círculo inscrito e perde uns
 * 2px, como os do comprido.
 */
const BOB_CROWN =
    'M179.1,70C173.9,61.1 170.8,59.5 170.8,47.4C170.8,38.5 169.4,31.5 163.7,24.4C158.5,17.9 151.6,13.4 143.6,11.1' +
    'C132.5,8 128.3,10.7 119.4,12.9C113.4,8.3 112.6,7.1 104.6,4.7C99.1,3 93.1,2.4 87.4,2.7C76,3.3 64.5,7.1 54.5,12.6' +
    'C44.5,18.1 35.4,26.4 32.1,37.7C27.9,52.4 35.2,51.7 22.4,70.2';

/**
 * Massa do chanel: a coroa, o lado esquerdo até o canto de baixo, por trás do
 * rosto até o canto do outro lado, e o lado direito de volta.
 *
 * Ela é maciça por trás do rosto e das orelhas. Na silhueta há um recorte no
 * formato de cada orelha, porque lá a orelha tampava o cabelo; aqui a orelha é
 * desenhada por cima da massa, então o recorte foi preenchido. O fecho de baixo,
 * em y 134,2, corre inteiro atrás do rosto, e do canto do rosto para fora a
 * borda de baixo aparece rente à curva da mandíbula, como lá.
 */
const BOB_MASS =
    BOB_CROWN +
    'C16.6,78.1 13.2,87 13.7,96.8C14.4,111.5 24.4,114 25.4,122.5C26.3,129.8 21.8,132.5 21.9,136' +
    'C22.1,141.3 27.9,142.9 33.1,141.4C37.7,140.1 42.2,138.4 46.9,137.3C49.9,136.7 58.8,134.9 61,134.2' +
    // Por trás do rosto, de um canto de baixo ao outro.
    'L138.6,134.2' +
    'C141.4,135 149.4,136.5 152.6,137.1C156.8,137.9 162.2,139.7 166.4,140.9C171.3,142.3 177.6,141 177.9,135.8' +
    'C178.3,131.1 173.1,130.5 173.7,122.5C174.3,113.4 184.5,111.5 186.5,97.3C187.9,87.7 184.7,77.7 179.1,70Z';

/**
 * Franja do chanel: a coroa, a franja e as mechas das laterais, que ficam na
 * frente do rosto.
 *
 * Nas laterais ela fecha por dentro da massa, numa reta que passa acima da
 * orelha, com pelo menos 1,1 de folga: a mecha termina no cacho em cima dela, e
 * a orelha continua por cima da massa, como lá.
 *
 * Contra a sobrancelha (ver o cabeçalho), o ponto mais perto é a ponta da mecha
 * da franja, a 2,3 do arco dos cílios. A borda de dentro das mechas fica a 0,8
 * do cílio.
 */
const BOB_FRINGE =
    BOB_CROWN +
    'L51.9,77.3C54.4,76.6 56.7,74 56.7,71.5C56.7,65.5 56.7,60 56.7,54.9C64.7,50.7 71.6,46.5 76.5,38.5' +
    'C77.4,42.2 77.6,47.7 82,47.7C87.2,47.7 96.2,44.7 100.8,42.2C109.7,37.4 109.6,35.3 114.8,28.6' +
    'C122.5,40.3 130.1,46.4 143.3,50.9C143.3,57 143.3,65.5 143.3,71.5C143.3,74 145.6,76.6 148.1,77.3Z';

/**
 * Coroa do liso, **decalcada da imagem de referência** (798x795, cabeça em
 * x 213..618): dois lóbulos largos, com topo em y 5 e um entalhe raso no meio
 * (y 9,4), que descem num ombro cheio até as laterais retas em x 35,7 / 164,3.
 * As laterais ficam 17px para fora da cabeça, como na referência.
 *
 * Na vertical o decalque foi mapeado em trechos, porque a cabeça daqui é mais
 * alta que a de lá: a coroa e a testa numa escala de 0,31, a lateral do rosto
 * até o alto da orelha, o corpo até o queixo e o pé até a borda da tela — assim
 * os cantos arredondados de baixo continuam à vista, como na referência.
 *
 * Vai do lado esquerdo, na altura do alto da orelha (y 77,5), ao direito. A
 * massa e a franja começam por ela, então as duas camadas se encaixam sem
 * emenda.
 */
const STRAIGHT_CROWN = 'M35.7,77.5C35.7,32 52,5.04 84,5.04C90,5.04 96.5,6.6 100,9.35' + 'C103.5,6.6 110,5.04 116,5.04C148,5.04 164.3,32 164.3,77.5';

/** Massa do liso: a coroa, as laterais retas e os cantos de baixo, que entram atrás dos ombros. */
const STRAIGHT_MASS = STRAIGHT_CROWN + 'L164.2,165C164.2,178 156,192 145,200L55,200C44,192 35.8,178 35.8,165Z';

/**
 * Franja do liso: linha da testa reta em y 42,6, com a risca no meio (ápice em
 * y 32). Nas laterais ela cobre a borda do rosto até o alto da orelha (y 77,5),
 * onde a orelha passa a ficar por cima do cabelo. A borda de dentro fica em
 * x 57, a mesma folga do afro: nenhum estilo de sobrancelha nem o cílio encosta
 * nela (conferido ponto a ponto).
 *
 * Sem quina viva: a risca sai da linha da testa na horizontal antes de subir ao
 * ápice (só o ápice é pontudo, como na referência), e a faixa da lateral acaba
 * num quarto de círculo que encontra a borda da cabeça no alto da orelha.
 */
const STRAIGHT_FRINGE =
    STRAIGHT_CROWN +
    'L147,77.5C144.8,77.5 143,75.7 143,73.5L143,62C143,50 137,42.6 129,42.6L114,42.6C108,42.6 103.5,37.5 100,32' +
    'C96.5,37.5 92,42.6 86,42.6L71,42.6C63,42.6 57,50 57,62L57,73.5C57,75.7 55.2,77.5 53,77.5Z';

/**
 * Curto.
 *
 * Capacete que sobra para fora da cabeça dos dois lados, desce até encostar no
 * alto da orelha (y 78) e termina em costeleta de ponta arredondada.
 *
 * O que dá o caráter não é a silhueta de fora, é a **franja recortada**: a linha
 * do cabelo não é um arco, é uma sequência de lobos arredondados pendurados,
 * separados por entalhes que sobem em ponta. Franja lisa no mesmo contorno vira
 * touca de natação.
 *
 * Três medidas mandam aqui:
 *
 *   **O pé da franja para em y 46.** A faixa da sobrancelha começa em 49, e a
 *   sobrancelha é desenhada DEPOIS do cabelo — descer mais e ela reapareceria
 *   por cima da franja, o que lê como erro de camada.
 *
 *   **A costeleta para em y 76.** A orelha começa em 78; passar disso cobre o
 *   alto dela e o corte perde a referência de tamanho.
 *
 *   **O topete.** Uma mecha em pé fora do eixo, à esquerda. É o único ponto
 *   assimétrico de propósito do desenho; sem ele o capacete fica cabeça de lego.
 */
const CAP =
    // Contorno de fora: costeleta esquerda, lado, topete, coroa, lado, costeleta direita.
    'M57,72C57,79 50,83 45,76C40,62 40,43 49,30C54,22 61,16 68,13' +
    'L67,4C71,6 74,8 77,10C90,3 114,3 128,13C144,22 157,35 157,52' +
    'C157,67 152,76 147,79C142,81 140,75 140,68' +
    // Franja, da direita para a esquerda: varredura longa, entalhe, lobo, entalhe, lobo.
    'C139,57 133,46 126,47C118,48 108,46 103,41' +
    'C101,39 99,37 98,34C95,39 91,45 86,45' +
    'C81,45 77,41 74,36C71,41 69,46 66,46C62,46 58,54 57,72Z';

/**
 * Afro curto, **decalcado da imagem de referência**.
 *
 * O contorno foi extraído dos pixels da referência (596x773, cabeça em
 * x 146..475) e trazido para esta grade, com a linha da testa em y 44 e escala
 * vertical de 0,33. Com essa escala o fim da lateral de lá cai logo acima da
 * orelha daqui, como na referência.
 *
 * Lá o cabelo sai para fora da cabeça dos dois lados. Aqui **não**: as laterais
 * ficam rente à linha da cabeça, e a coroa foi redistribuída nessa largura
 * (x comprimido em 0,82, alturas mantidas). Mais largo que o rosto, o afro
 * parecia um capacete.
 *
 *   coroa     cinco lóbulos com vales em ponta entre eles: o do meio mais alto
 *             (y 8,5), os vizinhos em y 11,4 e os de fora em y 19,6.
 *   lado      em x 52,5 / 147,5 — meio pixel para fora da cabeça, para a pele
 *             não vazar na borda.
 *   costeleta dentro do rosto, em x 52,5..57, com ponta em meio círculo em
 *             y 73,3, acima da orelha (78). É estreita para não encostar no
 *             cílio de fora, que chega a x 57,5.
 *   testa     reta em y 44, com cantos arredondados que descem até a costeleta.
 *             Nenhum estilo de sobrancelha nem o cílio encosta na borda
 *             (conferido ponto a ponto).
 */
const AFRO =
    'M57,71C57,72.24 56,73.25 54.75,73.25C53.5,73.25 52.5,72.24 52.5,71L52.5,34' +
    // Coroa, da esquerda para a direita.
    'C52.5,24 58,19.6 65,19.6C67.4,19.6 69.1,20.3 69.8,21.2C71.1,14.5 76.1,11.4 81.9,11.4C85.2,11.4 88,12.8 89.2,15' +
    'C90.9,10.5 95.1,8.5 100,8.5C104.9,8.5 109.1,10.5 110.8,15C112,12.8 114.8,11.4 118.1,11.4C123.9,11.4 128.9,14.5 130.2,21.2' +
    'C130.9,20.3 132.6,19.6 135,19.6C142,19.6 147.5,24 147.5,34L147.5,71' +
    'C147.5,72.24 146.5,73.25 145.25,73.25C144,73.25 143,72.24 143,71' +
    // Linha da testa, da direita para a esquerda.
    'L143,60C143,50 138,44 131,44L69,44C62,44 57,50 57,60Z';

/**
 * Calvo, **decalcado da imagem de referência**.
 *
 * Lá o cabelo é uma faixa em degradê colada ao topo da cabeça, e o contorno foi
 * tirado no meio do degradê. Aqui a faixa é chapada e acompanha o contorno da
 * cabeça, 0,7px para fora, para a pele não vazar na borda.
 *
 * A borda de baixo faz um **M**: a faixa chega a y 30 no meio e quase some nas
 * entradas (x≈74 / 126), onde fica com 2,7px. É esse recuo que faz ler
 * como calvície, e não como touca. Nos cantos a faixa desce pela curva da
 * cabeça e termina na lateral em y 54, onde a curva acaba.
 *
 * A cabeça daqui é bem mais arredondada que a da referência (canto de raio 34
 * numa largura de 94, contra 70 em 368), então a faixa foi desenhada sobre o
 * contorno daqui, não copiada em escala.
 */
const BALDING =
    'M52.3,54C52.3,34.84 67.84,19.3 87,19.3L113,19.3C132.16,19.3 147.7,34.84 147.7,54' +
    // Borda de baixo, da direita para a esquerda: entrada, meio, entrada.
    'C147.2,52 145.6,51 144.4,51C143.3,39.8 136.3,30 126,25.3C120.5,22.8 107,30 100,30' +
    'C93,30 79.5,22.8 74,25.3C63.7,30 56.7,39.8 55.6,51C54.4,51 52.8,52 52.3,54Z';

/**
 * Coque, **decalcado da imagem de referência** (1254x1254) e do SVG que veio
 * com ela, que é o contorno da mesma imagem.
 *
 * A referência é o próprio avatar. A largura do rosto de lá (553px) vira a da
 * cabeça daqui (94), centrada em x 100, e o topo da sobrancelha fica em y 53
 * nas duas. Acima da sobrancelha a escala é a mesma nos dois eixos, para o
 * coque continuar redondo; abaixo, a vertical estica 9,5%, porque o rosto daqui
 * é mais comprido. Assim a ponta das mechas cai no meio da orelha, como lá.
 *
 *   coque   quase um círculo de raio 30, deslocado para a direita (x 76..136)
 *   domo    abre até x 43,7 / 155,2, na altura da sobrancelha
 *   risca   à esquerda do centro, com o vértice em (88,5,26,3)
 *   franja  a metade direita varre a testa na diagonal; a esquerda desce
 *           direto para a mecha
 *   mechas  emolduram o rosto por fora e terminam em ponta em y 92,9, por
 *           cima da orelha
 *
 * Fora das pontas da sobrancelha, o contorno fica em média a 0,13 do da
 * referência. Nas pontas ele se afasta de propósito: lá a franja direita
 * encosta na sobrancelha e a mecha esquerda passa rente a ela, e aqui o arco
 * dos cílios sobe até y 49,2 e ficaria grudado no cabelo. As duas contornam a
 * ponta da sobrancelha a pelo menos 2,2 de qualquer estilo dela (ver o
 * cabeçalho).
 *
 * Nessa grade o topo do coque fica em y -16,4, fora da tela: ver `BUN_FIT`.
 */
const BUN =
    // Do entalhe entre o coque e o domo, à esquerda: por fora do domo e da mecha, até a ponta.
    'M76,7.2C70.9,10.3 69.2,9.9 62.9,14.8C58.9,17.9 55.3,21.9 52.4,26.1C47.1,34 43.7,44.8 43.7,54.4' +
    'C43.7,61.8 45.5,64.8 47.5,71.2C49.1,76.5 51.1,89.5 54.6,92.9' +
    // Por dentro da mecha e pela franja esquerda, contornando a ponta da sobrancelha, até a risca.
    'C54.8,91.2 54.4,85.5 54.4,83.3C54.4,80.2 54.8,76.7 55.2,73.5C55.6,69.7 56.5,58.4 57.7,55.8' +
    'C60.6,49.7 69.2,49 72.8,46.8C74.7,45.5 80.1,39.4 81.7,37.3C84.1,34.1 87.7,27.3 88.5,26.3' +
    // Franja direita, contornando a outra ponta, e mecha direita por dentro, até a ponta.
    'C92.4,33.9 95.7,40 104.4,44C111.2,47.1 117.8,46.5 124.9,46.9C131.3,47.2 135.8,49 140.1,54' +
    'C144.4,58.9 144.2,64 144.3,70.4C144.4,74.5 144.8,78.2 144.8,81.6C144.8,83.8 144.5,91.6 144.8,92.9' +
    // Por fora da mecha e do domo, até o entalhe da direita.
    'C147.5,89.6 149.6,80.5 150.9,76.2C153.7,66.8 155.2,63.2 155.2,52.9C155.2,46 153.6,39.8 150.8,33.5' +
    'C149.1,29.9 147,26.5 144.4,23.4C140.7,19.1 137.8,17.6 135.5,15.1' +
    // Coque, da direita para a esquerda.
    'C136.6,5.8 136.4,-0.7 128.9,-8.1C122.4,-14.6 114.8,-16.4 105.9,-16.4C99.4,-16.4 91.8,-14.2 86.6,-10.2C79.8,-5 78.4,-0.2 76,7.2Z';

/**
 * Fios claros, também decalcados: quatro crescentes com a ponta em quina e
 * cada lado numa curva só. Um no alto do coque, um no domo logo abaixo dele,
 * um na lateral direita e um na mecha esquerda. A cor sai de `sheen`.
 */
const BUN_SHINE =
    'M89,4C103.8,-8.6 121,-6.9 127.1,10.8C126.3,-9.4 98.8,-12.1 89,4Z' +
    'M62.5,25.3C74.8,11.9 91.2,6.2 109.1,8.6C92.6,3 71,9.4 62.5,25.3Z' +
    'M120.8,18.1C135.5,25.4 143.7,36.8 149.2,51.6C147.6,36.7 136.2,21.1 120.8,18.1Z' +
    'M49.1,72.7C51.9,62.7 54.7,53.5 61,44.8C52.8,50.3 48.6,63.3 49.1,72.7Z';

/**
 * Encaixe da cena para o coque caber. A cena inteira (cabeça, corpo e roupa)
 * encolhe para 91,3% em torno do pé da tela, e o topo do coque desce de y -16,4
 * para 2,4. É a composição da referência, onde o rosto também fica menor e
 * mais baixo que nos outros cortes para o coque caber no quadro.
 */
const BUN_FIT = 'translate(100,200) scale(0.913) translate(-100,-200)';

export function hair(style: HairStyle, color: string): HairLayers {
    if (style === 'comprido') {
        return {
            back: `<path d="${LONG_MASS}" fill="${color}"/>`,
            front: `<path d="${LONG_CURTAIN}" fill="${color}"/>`,
        };
    }

    if (style === 'liso') {
        return {
            back: `<path d="${STRAIGHT_MASS}" fill="${color}"/>`,
            front: `<path d="${STRAIGHT_FRINGE}" fill="${color}"/>`,
        };
    }

    if (style === 'chanel') {
        return {
            back: `<path d="${BOB_MASS}" fill="${color}"/>`,
            front: `<path d="${BOB_FRINGE}" fill="${color}"/>`,
        };
    }

    // Curto, afro e calvo não têm camada de trás: param no alto da orelha, então
    // não há nada deles atrás do pescoço nem da roupa.
    if (style === 'curto') {
        return { back: '', front: `<path d="${CAP}" fill="${color}"/>` };
    }

    if (style === 'afro') {
        return { back: '', front: `<path d="${AFRO}" fill="${color}"/>` };
    }

    if (style === 'calvo') {
        return { back: '', front: `<path d="${BALDING}" fill="${color}"/>` };
    }

    // O coque também não tem camada de trás: o cabelo sobe todo para ele, e as
    // mechas terminam no meio da orelha.
    if (style === 'coque') {
        return {
            back: '',
            front: `<path d="${BUN}" fill="${color}"/><path d="${BUN_SHINE}" fill="${sheen(color)}"/>`,
            fit: BUN_FIT,
        };
    }

    return EMPTY;
}

import type { TileMapDefinition } from "../tileMap";

// Mapa "Mediterranean" — desenhado à mão por Estevan.
// Inspirado no Mediterrâneo ocidental: Península Ibérica (com um forte e torres de vigia) e França
// no alto à esquerda, Itália descendo em escada à direita, Córsega e Sardenha no
// centro, Baleares (Menorca, Maiorca, Ibiza) a oeste, Norte da África embaixo
// com ruínas e a ponta da Tunísia, e a Sicília no canto inferior direito.
// Colunas 0–25, linhas 0–15 (tiles de 64 px → arena 1664×1024).
//
// Terreno ("grid"):
//   "." água · "s" areia · "g" terra com grama
//   "P" spawn do jogador · "E" spawn de inimigo (ambos na água)
//   Regiões de estilos diferentes não podem se tocar (cada uma tem costa própria).
//
// Elementos ("features"), só sobre terra; "." = nada:
//   Fortes (conectam-se sozinhos aos vizinhos):
//     "O" torre · "Q" torre com alçapão (isolada) · "#" muralha (ponta arredondada
//     quando termina) · "=" portão · "%" muralha em ruínas · "+" muralha larga
//     "^" "v" ">" "<" canhão na muralha, apontando para esse lado
//     Cruzamentos e curvas de muralha precisam de uma torre; torre liga até 2 muralhas.
//   Praia (numa costa reta; o tile gira para a água): "b" barco · "k" canhão · "R" pedra
//   Enfeites: "r" pedra · "m" pedra com musgo · "l" folhagem · "f" brotos
export const mediterranean: TileMapDefinition = {
  name: "Mediterranean",
  author: "Estevan",
  grid: [
    "gggggggggg...E......gggggg", //  0
    "gggggggggg..........gggggg", //  1
    "ggggggg...............gggg", //  2
    "ggggggg...............gggg", //  3
    "ggggggg.................gg", //  4
    "ggggg..ssss.....ggg.....gg", //  5
    "ggggg..ssss..E..ggg.......", //  6
    "ggggg..ssss.....ggg.....E.", //  7
    "ggggg..ssss.....ggg.......", //  8
    "..........................", //  9
    ".E...ss.....P.........gggg", // 10
    ".....ss..........ggg..gggg", // 11
    ".................ggg..gggg", // 12
    "gggggggggggggggggggg......", // 13
    "gggggggggggggggggggg...E..", // 14
    "gggggggggggggggggggg......", // 15
  ],
  features: [
    "........Q............f....", //  0
    "Q.O#=#O................O.l", //  1
    ".l#...>................<..", //  2
    "..#mQ.O................O..", //  3
    "f.O.......................", //  4
    "..#l.............O.......R", //  5
    ".m>....r.........=R.......", //  6
    "..O#O............#........", //  7
    "...k.....b......l.........", //  8
    "..........................", //  9
    ".....r................f...", // 10
    "..................Q....O^#", // 11
    ".......................b..", // 12
    "...k....b.................", // 13
    "..l..O%%%O.l..#+#.l.......", // 14
    ".............m...f........", // 15
  ],
};

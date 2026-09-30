import type { TileMapDefinition } from "../tileMap";

// Mapa "Mediterranean" — desenhado à mão por Estevan.
// Inspirado no Mediterrâneo ocidental: Península Ibérica (com um forte) no alto
// à esquerda, Itália descendo à direita, Córsega e Sardenha no centro, Baleares
// a oeste, Norte da África embaixo com ruínas, e a Sicília à direita.
// As regiões são retângulos: o tileset não tem peça de canto côncavo, e em
// 128 px o degrau quadrado de uma costa em escada fica evidente.
// Colunas 0–15, linhas 0–8 (tiles de 128 px → arena 2048×1152).
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
    "gggg...E.....ggg", // 0
    "gggg.........ggg", // 1
    "......ss........", // 2
    "......ss........", // 3
    "E..ss...P..ggg.E", // 4
    "...ss......ggg..", // 5
    "...........ggg..", // 6
    "ggggggggg......E", // 7
    "ggggggggg..E....", // 8
  ],
  features: [
    "lO#O............", // 0
    "...............Q", // 1
    "................", // 2
    "................", // 3
    "................", // 4
    "............l...", // 5
    "................", // 6
    "................", // 7
    "..O%%O.l........", // 8
  ],
};

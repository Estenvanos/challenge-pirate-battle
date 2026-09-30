// Bundles do PIXI.Assets. Tudo é carregado em tamanho real (resolution 1):
// - tiles: a arte de png/retina (128 px), que é o tamanho da célula do mapa;
// - navios, peças e efeitos: png/default. Os PNGs avulsos de png/retina têm os
//   mesmos pixels (só a folha *_retina é 2×), então carregá-los como 2× os
//   desenhava pela metade em telas de DPR alto.

import type { ShipSprite } from "../../config/enemies";
import { GAME_CONFIG } from "../../config/gameConfig";

export type { ShipSprite };

export const TILES_BUNDLE = "tiles";

// Tiles numerados de 1 a 96 (png/retina/tiles/tile_N.png). Cada tile tem a própria
// textura: recortar da folha fazia a filtragem puxar pixels dos vizinhos e
// deixava linhas finas entre os tiles quando a arena é escalada.
export const TILE_COUNT = 96;

export const tileAlias = (tile: number) => `tile_${tile}`;

export const SHIPS_BUNDLE = "ships";

// Navios usados no jogo (png/default/ships/<nome>.png); a proa aponta para baixo (+y).
// ship_2 (pirata preto) é o jogador; os dos inimigos, com seus estágios de
// dano, vêm de `config/enemies.ts`.
export const SHIP_SPRITES: readonly ShipSprite[] = [
  ...new Set<ShipSprite>([
    "ship_2",
    ...Object.values(GAME_CONFIG.enemies.kinds).flatMap(({ sprites }) => [
      ...sprites.stages,
      sprites.destroyed,
    ]),
  ]),
];

export const CANNON_BALL = "cannon_ball";

export const EFFECTS_BUNDLE = "effects";

// Clarão na boca do canhão: png/default/effects/explosion_3.png.
export const MUZZLE_FLASH = "explosion_3";

export function buildManifestBundles() {
  return [
    {
      name: TILES_BUNDLE,
      assets: Array.from({ length: TILE_COUNT }, (_, i) => ({
        alias: tileAlias(i + 1),
        src: `/assets/png/retina/tiles/tile_${i + 1}.png`,
      })),
    },
    {
      name: SHIPS_BUNDLE,
      assets: [
        ...SHIP_SPRITES.map((ship) => ({
          alias: ship,
          src: `/assets/png/default/ships/${ship}.png`,
        })),
        {
          alias: CANNON_BALL,
          src: `/assets/png/default/ship_parts/${CANNON_BALL}.png`,
        },
      ],
    },
    {
      name: EFFECTS_BUNDLE,
      assets: [
        {
          alias: MUZZLE_FLASH,
          src: `/assets/png/default/effects/${MUZZLE_FLASH}.png`,
        },
      ],
    },
  ];
}

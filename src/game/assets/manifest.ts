// Bundles do PIXI.Assets. A variante retina (2×) é escolhida pelo DPR na
// primeira carga e carregada com resolution 2, mantendo o tamanho lógico.

import type { ShipSprite } from "../../config/enemies";
import { GAME_CONFIG } from "../../config/gameConfig";

export type { ShipSprite };

export const TILES_BUNDLE = "tiles";

// Tiles numerados de 1 a 96 (png/*/tiles/tile_N.png). Cada tile tem a própria
// textura: recortar da folha fazia a filtragem puxar pixels dos vizinhos e
// deixava linhas finas entre os tiles quando a arena é escalada.
export const TILE_COUNT = 96;

export const tileAlias = (tile: number) => `tile_${tile}`;

export const SHIPS_BUNDLE = "ships";

// Navios usados no jogo (png/*/ships/<nome>.png); a proa aponta para baixo (+y).
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

export function buildManifestBundles(devicePixelRatio: number) {
  const retina = devicePixelRatio > 1;
  const folder = retina ? "retina" : "default";
  return [
    {
      name: TILES_BUNDLE,
      assets: Array.from({ length: TILE_COUNT }, (_, i) => ({
        alias: tileAlias(i + 1),
        src: `/assets/png/${folder}/tiles/tile_${i + 1}.png`,
        data: { resolution: retina ? 2 : 1 },
      })),
    },
    {
      name: SHIPS_BUNDLE,
      assets: [
        ...SHIP_SPRITES.map((ship) => ({
          alias: ship,
          src: `/assets/png/${folder}/ships/${ship}.png`,
          data: { resolution: retina ? 2 : 1 },
        })),
        {
          alias: CANNON_BALL,
          src: `/assets/png/${folder}/ship_parts/${CANNON_BALL}.png`,
          data: { resolution: retina ? 2 : 1 },
        },
      ],
    },
  ];
}

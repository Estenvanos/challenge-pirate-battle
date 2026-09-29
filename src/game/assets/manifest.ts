// Bundles do PIXI.Assets. A variante retina (2×) é escolhida pelo DPR na
// primeira carga e carregada com resolution 2, mantendo o tamanho lógico.

export const TILES_BUNDLE = "tiles";

// Tiles numerados de 1 a 96 (png/*/tiles/tile_N.png). Cada tile tem a própria
// textura: recortar da folha fazia a filtragem puxar pixels dos vizinhos e
// deixava linhas finas entre os tiles quando a arena é escalada.
export const TILE_COUNT = 96;

export const tileAlias = (tile: number) => `tile_${tile}`;

export const SHIPS_BUNDLE = "ships";

// Navios usados no jogo (png/*/ships/<nome>.png); a proa aponta para baixo (+y).
export const SHIP_SPRITES = ["ship_2"] as const;

export type ShipSprite = (typeof SHIP_SPRITES)[number];

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
      assets: SHIP_SPRITES.map((ship) => ({
        alias: ship,
        src: `/assets/png/${folder}/ships/${ship}.png`,
        data: { resolution: retina ? 2 : 1 },
      })),
    },
  ];
}

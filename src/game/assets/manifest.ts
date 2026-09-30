import type { ShipSprite } from "../../config/enemies";
import { GAME_CONFIG } from "../../config/gameConfig";

export type { ShipSprite };

export const TILES_BUNDLE = "tiles";

export const TILE_COUNT = 96;

export const tileAlias = (tile: number) => `tile_${tile}`;

export const SHIPS_BUNDLE = "ships";

export const SHIP_SPRITES: readonly ShipSprite[] = [
  ...new Set<ShipSprite>(
    [GAME_CONFIG.player, ...Object.values(GAME_CONFIG.enemies.kinds)].flatMap(
      ({ sprites }) => [...sprites.stages, sprites.destroyed],
    ),
  ),
];

export const CANNON_BALL = "cannon_ball";

export const CREW_SPRITES = [
  "crew_1",
  "crew_2",
  "crew_3",
  "crew_4",
  "crew_5",
  "crew_6",
] as const;

export const EFFECTS_BUNDLE = "effects";

export const MUZZLE_FLASH = "explosion_3";

export const EFFECT_SPRITES = [
  MUZZLE_FLASH,
  "explosion_1",
  "explosion_2",
  "fire_1",
  "fire_2",
  "heal_plus",
  "heal_aura",
] as const;

export type EffectSprite = (typeof EFFECT_SPRITES)[number];

export const HUD_BUNDLE = "hud";

export const HEALTH_BAR = {
  frame: "enemy_health_frame",
  green: "enemy_health_fill_green",
  red: "enemy_health_fill_red",
} as const;

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
        ...CREW_SPRITES.map((crew) => ({
          alias: crew,
          src: `/assets/png/default/ship_parts/${crew}.png`,
        })),
      ],
    },
    {
      name: EFFECTS_BUNDLE,
      assets: EFFECT_SPRITES.map((effect) => ({
        alias: effect,
        src: `/assets/png/default/effects/${effect}.png`,
      })),
    },
    {
      name: HUD_BUNDLE,
      assets: Object.values(HEALTH_BAR).map((alias) => ({
        alias,
        src: `/assets/png/default/ui/hud/${alias}.png`,
      })),
    },
  ];
}

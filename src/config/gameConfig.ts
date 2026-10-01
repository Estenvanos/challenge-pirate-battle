import { createEnemyConfig, type DamageSprites } from "./enemies";
import type { GameOptions } from "./options";

export type { ShipMotion } from "./enemies";

/** Gameplay balance; systems read these values without embedding balance rules. */
const PLAYER = Object.freeze({
  maxSpeed: 210,
  acceleration: 320,
  drag: 240,
  turnSpeed: 2.5,
  spriteScale: 1.35,
  radius: 34,
  /** Hull half-length in pixels, used for island and projectile collision. */
  hullHalfLength: 67,
  initialRotation: -Math.PI / 2,
  maxHp: 100,
  repair: Object.freeze({ everyKills: 3, amount: 10 }),
  sprites: Object.freeze({
    stages: Object.freeze(["ship_2", "ship_8", "ship_14"] as const),
    destroyed: "ship_20",
  }) satisfies DamageSprites,
  weapons: Object.freeze({
    front: Object.freeze({
      cooldownSec: 0.45,
      shots: 1,
      speed: 720,
      range: 720,
      damage: 5.75,
    }),
    side: Object.freeze({
      cooldownSec: 1.2,
      shots: 3,
      speed: 620,
      range: 460,
      damage: 5.75,
    }),
    /** Spacing between broadside cannons along the hull, in pixels. */
    shotSpacing: 32,
  }),
});

export const GAME_CONFIG = Object.freeze({
  loop: Object.freeze({
    /** Fixed simulation step and maximum accepted frame delta, in seconds. */
    stepSec: 1 / 60,
    maxFrameDeltaSec: 0.25,
  }),
  player: PLAYER,
  spawn: Object.freeze({
    minPlayerDistance: 700,
  }),
  enemies: createEnemyConfig(PLAYER),
  projectile: Object.freeze({ radius: 5 }),
});

export type GameConfig = typeof GAME_CONFIG;

/** Captures the current options for one match; later changes affect the next. */
export function createMatchConfig(options: Readonly<GameOptions>) {
  return Object.freeze({
    ...GAME_CONFIG,
    sessionTimeSec: options.sessionTimeSec,
    spawn: Object.freeze({
      ...GAME_CONFIG.spawn,
      intervalSec: options.spawnIntervalSec,
    }),
  });
}

export type MatchConfig = ReturnType<typeof createMatchConfig>;

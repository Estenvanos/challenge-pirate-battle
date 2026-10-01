/** Shared movement and collision dimensions for player and enemy ships. */
export interface ShipMotion {
  /** Pixels per second at full throttle. */
  readonly maxSpeed: number;
  /** Acceleration and deceleration in pixels per second squared. */
  readonly acceleration: number;
  readonly drag: number;
  /** Radians per second at full rudder. */
  readonly turnSpeed: number;
  /** Collision radius and half-length of the hull, in pixels. */
  readonly radius: number;
  readonly hullHalfLength: number;
}

export interface ProjectileSpec {
  /** Speed in pixels per second; range in pixels; damage in HP. */
  readonly speed: number;
  readonly range: number;
  readonly damage: number;
}

export type ShipSprite = `ship_${number}`;

export interface DamageSprites {
  /** Equally spaced damage stages, followed by the sunk hull. */
  readonly stages: readonly ShipSprite[];
  readonly destroyed: ShipSprite;
}

export interface EnemyWeapon {
  /** Stop approaching within this distance; fire only within attackRange. */
  readonly keepDistance: number;
  readonly attackRange: number;
  /** Maximum angle to the player before firing, in radians. */
  readonly aimTolerance: number;
  readonly fireCooldownSec: number;
  readonly projectile: ProjectileSpec;
}

export interface EnemySpec extends ShipMotion {
  /** Relative probability among all enemy kinds. */
  readonly spawnWeight: number;
  readonly maxHp: number;
  readonly spriteScale: number;
  readonly sprites: DamageSprites;
  /** Ramming enemies explode on impact; armed enemies hold distance and fire. */
  readonly ramDamage?: number;
  readonly weapon?: EnemyWeapon;
}

export type EnemyKind = "chaser" | "shooter" | "bigShooter";

const BIG_SCALE = 1.2;

const RED: DamageSprites = Object.freeze({
  stages: Object.freeze(["ship_3", "ship_9", "ship_15"] as const),
  destroyed: "ship_21",
});

const YELLOW: DamageSprites = Object.freeze({
  stages: Object.freeze(["ship_6", "ship_12", "ship_18"] as const),
  destroyed: "ship_24",
});

const BLUE: DamageSprites = Object.freeze({
  stages: Object.freeze(["ship_5", "ship_11", "ship_17"] as const),
  destroyed: "ship_23",
});

const WEAPON: EnemyWeapon = Object.freeze({
  keepDistance: 380,
  attackRange: 560,
  aimTolerance: 0.14,
  fireCooldownSec: 2.2,
  projectile: Object.freeze({ speed: 400, range: 620, damage: 5 }),
});

const BIG_WEAPON: EnemyWeapon = Object.freeze({
  ...WEAPON,
  projectile: Object.freeze({ ...WEAPON.projectile, damage: 4 }),
});

export function createEnemyConfig(
  player: ShipMotion & { readonly spriteScale: number },
) {
  const medium = {
    radius: player.radius,
    hullHalfLength: player.hullHalfLength,
    spriteScale: player.spriteScale,
  };
  const chaserMotion = {
    maxSpeed: 150,
    acceleration: 225,
    drag: 225,
    turnSpeed: 2,
  };
  const shooterMotion = {
    maxSpeed: 125,
    acceleration: 187.5,
    drag: 187.5,
    turnSpeed: 1.7,
  };

  const biggerShooterMotion = {
    maxSpeed: 115,
    acceleration: 177.5,
    drag: 177.5,
    turnSpeed: 1.5,
  };

  const kinds: Readonly<Record<EnemyKind, EnemySpec>> = Object.freeze({
    chaser: Object.freeze({
      ...medium,
      ...chaserMotion,
      spawnWeight: 0.2,
      maxHp: 15,
      sprites: RED,
      ramDamage: 10,
    }),
    shooter: Object.freeze({
      ...medium,
      ...shooterMotion,
      spawnWeight: 0.56,
      maxHp: 20,
      sprites: YELLOW,
      weapon: WEAPON,
    }),
    bigShooter: Object.freeze({
      ...medium,
      ...biggerShooterMotion,
      radius: player.radius * BIG_SCALE,
      hullHalfLength: player.hullHalfLength * BIG_SCALE,
      maxHp: 30,
      spriteScale: player.spriteScale * BIG_SCALE,
      spawnWeight: 0.24,
      sprites: BLUE,
      weapon: BIG_WEAPON,
    }),
  });

  return Object.freeze({
    // Below this heading error, steering becomes proportional to prevent zigzagging.
    fullRudderAngle: 0.6,
    // Minimum throttle while turning; the ship slows as its heading diverges.
    minTurnThrottle: 0.3,
    // Aim this many path cells ahead when navigating around islands.
    pathLookahead: 2,
    kinds,
  });
}

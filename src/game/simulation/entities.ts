import type { EnemyKind } from "../../config/enemies";

export type { EnemyKind };

export interface Ship {
  readonly id: string;
  x: number;
  y: number;
  rotation: number;
  speed: number;
  /** Previous fixed-step transform for render interpolation. */
  prevX: number;
  prevY: number;
  prevRotation: number;
  readonly radius: number;
  hp: number;
  readonly maxHp: number;
}

export interface ShipControl {
  /** Throttle is 0–1; turn is -1 to 1. */
  throttle: number;
  turn: number;
}

export interface Enemy extends Ship {
  readonly kind: EnemyKind;
  readonly control: ShipControl;
  fireCooldown: number;
}

export interface Projectile {
  readonly id: string;
  readonly owner: "player" | "enemy";
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  readonly vx: number;
  readonly vy: number;
  travelled: number;
  readonly range: number;
  readonly damage: number;
  readonly radius: number;
}

import type { MatchConfig } from "../../config/gameConfig";
import type { Point, Polygon } from "../arena";
import { createRng, type Rng } from "../core/random";
import type { Enemy, Projectile, Ship } from "./entities";
import {
  createFlowField,
  createNavGrid,
  type FlowField,
  type NavGrid,
} from "./navigation";

export interface WorldMap {
  readonly width: number;
  readonly height: number;
  readonly islands: readonly Polygon[];
  readonly playerSpawn: Point;
  readonly enemySpawns: readonly Point[];
  readonly cols: number;
  readonly rows: number;
  readonly tileSize: number;
  /** Returns land at a cell, or null for water. */
  groundAt(col: number, row: number): unknown;
}

/** Discrete simulation events consumed by presentation and UI callbacks. */
export type WorldEvent =
  | {
      readonly type: "shotFired";
      readonly weapon: "front" | "side";
      readonly shipId: string;
      readonly x: number;
      readonly y: number;
      readonly angle: number;
      readonly shots: number;
    }
  | {
      readonly type: "projectileEnded";
      readonly cause: "range" | "island" | "bounds" | "ship";
      readonly x: number;
      readonly y: number;
    }
  | { readonly type: "enemySpawned"; readonly x: number; readonly y: number }
  | {
      readonly type: "shipDamaged";
      readonly shipId: string;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: "enemyDestroyed";
      readonly id: string;
      readonly x: number;
      readonly y: number;
      readonly cause: "shot" | "ram";
    }
  | { readonly type: "playerRepaired" }
  | {
      readonly type: "playerDestroyed";
      readonly x: number;
      readonly y: number;
    };

export type EndReason = "timeUp" | "playerDestroyed";

/** Continuous match state; a restart creates a new instance. */
export interface World {
  readonly arena: { readonly width: number; readonly height: number };
  readonly islands: readonly Polygon[];
  readonly enemySpawns: readonly Point[];
  readonly navGrid: NavGrid;
  /** One flow field toward the player, shared by all enemies. */
  readonly flowField: FlowField;
  readonly rng: Rng;
  readonly player: Ship;
  readonly playerCooldowns: { front: number; left: number; right: number };
  enemies: Enemy[];
  projectiles: Projectile[];
  /** Drained by Game after each fixed step. */
  readonly events: WorldEvent[];
  spawnTimer: number;
  nextId: number;
  score: number;
  /** Active play time; pauses never advance it. */
  elapsedSec: number;
  /** Once set, further simulation steps cannot change the match. */
  endReason: EndReason | null;
}

export function createWorld(
  map: WorldMap,
  config: MatchConfig,
  seed: number,
): World {
  const navGrid = createNavGrid(map);
  return {
    arena: { width: map.width, height: map.height },
    islands: map.islands,
    enemySpawns: map.enemySpawns,
    navGrid,
    flowField: createFlowField(navGrid),
    rng: createRng(seed),
    player: {
      id: "player",
      x: map.playerSpawn.x,
      y: map.playerSpawn.y,
      rotation: config.player.initialRotation,
      speed: 0,
      prevX: map.playerSpawn.x,
      prevY: map.playerSpawn.y,
      prevRotation: config.player.initialRotation,
      radius: config.player.radius,
      hp: config.player.maxHp,
      maxHp: config.player.maxHp,
    },
    playerCooldowns: { front: 0, left: 0, right: 0 },
    enemies: [],
    projectiles: [],
    events: [],
    spawnTimer: 0,
    nextId: 1,
    score: 0,
    elapsedSec: 0,
    endReason: null,
  };
}

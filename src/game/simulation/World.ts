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
  /** Terra da célula; `null` = água. */
  groundAt(col: number, row: number): unknown;
}

/** Estado contínuo da partida. Uma partida nova cria um World novo. */
export interface World {
  readonly arena: { readonly width: number; readonly height: number };
  readonly islands: readonly Polygon[];
  readonly enemySpawns: readonly Point[];
  readonly navGrid: NavGrid;
  /** Caminho até o jogador, compartilhado pelos inimigos. */
  readonly flowField: FlowField;
  readonly rng: Rng;
  readonly player: Ship;
  enemies: Enemy[];
  projectiles: Projectile[];
  /** Tempo acumulado desde o último spawn (s). */
  spawnTimer: number;
  /** Contador para ids únicos de inimigos e projéteis. */
  nextId: number;
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
      angularVelocity: 0,
      radius: config.player.radius,
    },
    enemies: [],
    projectiles: [],
    spawnTimer: 0,
    nextId: 1,
  };
}

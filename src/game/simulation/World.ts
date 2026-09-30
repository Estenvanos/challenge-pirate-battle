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

/** Acontecimento pontual de um passo, para quem reage fora da simulação (áudio, efeitos). */
export type WorldEvent =
  | {
      readonly type: "shotFired";
      /** Proa (um projétil) ou bordada (vários). */
      readonly weapon: "front" | "side";
      readonly shipId: string;
      /** Boca do canhão (centro da bordada) e direção do disparo (rad). */
      readonly x: number;
      readonly y: number;
      readonly angle: number;
      readonly shots: number;
    }
  | {
      readonly type: "projectileEnded";
      /** Fim do alcance (cai na água), ilha, borda da arena ou casco de um navio. */
      readonly cause: "range" | "island" | "bounds" | "ship";
      readonly x: number;
      readonly y: number;
    }
  | { readonly type: "enemySpawned"; readonly x: number; readonly y: number };

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
  /** Segundos até cada arma do jogador poder disparar de novo. */
  readonly playerCooldowns: { front: number; left: number; right: number };
  enemies: Enemy[];
  projectiles: Projectile[];
  /** Eventos dos últimos passos; quem consome (o `Game`) esvazia a lista. */
  readonly events: WorldEvent[];
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
      prevX: map.playerSpawn.x,
      prevY: map.playerSpawn.y,
      prevRotation: config.player.initialRotation,
      radius: config.player.radius,
    },
    playerCooldowns: { front: 0, left: 0, right: 0 },
    enemies: [],
    projectiles: [],
    events: [],
    spawnTimer: 0,
    nextId: 1,
  };
}

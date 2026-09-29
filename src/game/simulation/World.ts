import type { GameConfig } from "../../config/gameConfig";
import type { Point, Polygon } from "../arena";
import type { Ship } from "./entities";

export interface WorldMap {
  readonly width: number;
  readonly height: number;
  readonly islands: readonly Polygon[];
  readonly playerSpawn: Point;
}

/** Estado contínuo da partida. Uma partida nova cria um World novo. */
export interface World {
  readonly arena: { readonly width: number; readonly height: number };
  readonly islands: readonly Polygon[];
  readonly player: Ship;
}

export function createWorld(map: WorldMap, config: GameConfig): World {
  return {
    arena: { width: map.width, height: map.height },
    islands: map.islands,
    player: {
      id: "player",
      x: map.playerSpawn.x,
      y: map.playerSpawn.y,
      rotation: config.player.initialRotation,
      speed: 0,
      angularVelocity: 0,
      radius: config.player.radius,
    },
  };
}

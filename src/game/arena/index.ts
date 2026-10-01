import { mediterranean } from "./maps/mediterranean";
import { buildTileMap } from "./tileMap";

export * from "./tileMap";

export const ARENA_MAP = buildTileMap(mediterranean);

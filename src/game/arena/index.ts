import { mediterranean } from "./maps/mediterranean";
import { buildTileMap } from "./tileMap";

export * from "./tileMap";

// Mapa fixo da arena, resolvido uma vez no carregamento do módulo.
export const ARENA_MAP = buildTileMap(mediterranean);

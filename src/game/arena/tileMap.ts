// Mapa em tiles da arena: converte os desenhos ASCII (terreno + elementos) em
// tiles, polígonos de colisão das ilhas e pontos de spawn. Módulo puro.

import {
  CORNER_OUTLINES,
  GRASS_PIECES,
  OUTLINE_TILE_SIZE,
  resolveLandTile,
  resolvePlainTile,
  SAND_PIECES,
  SHALLOW_PIECES,
  type CellSides,
  type GroundTile,
  type LandPieces,
} from "./autotile";
import { resolveFeatures, type LandStyle, type OverlayTile } from "./features";

export type { GroundTile, OverlayTile };

// Os tiles são desenhados no tamanho da arte retina (128 px): o mapa fica em
// escala dobrada em relação aos navios.
export const TILE_SIZE = 128;
// Recuo dos polígonos em lados voltados para a água, casando com a borda
// transparente (~4 px) da arte dos tiles de costa.
export const COAST_INSET_PX = 4;

export const WATER_TILE = 73;

const LAND_STYLES: Readonly<Record<LandStyle, LandPieces>> = {
  s: SAND_PIECES,
  g: GRASS_PIECES,
};

const WATER_CHARS = new Set([".", "P", "E"]);

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Polígono convexo em coordenadas da arena (px), vértices em sentido horário. */
export type Polygon = readonly Point[];

export interface TileMapDefinition {
  readonly name: string;
  readonly author: string;
  /** Terreno: uma string por linha; veja a legenda no arquivo do mapa. */
  readonly grid: readonly string[];
  /** Elementos sobre a terra (mesmo tamanho do terreno; "." = nada). */
  readonly features: readonly string[];
}

export interface TileMap {
  readonly name: string;
  readonly author: string;
  readonly cols: number;
  readonly rows: number;
  readonly tileSize: number;
  readonly width: number;
  readonly height: number;
  readonly waterTile: number;
  /**
   * Tile de terra da célula (`null` = só água). Aceita células fora da arena:
   * elas repetem a borda mais próxima, para o cenário continuar além dela.
   */
  groundAt(col: number, row: number): GroundTile | null;
  /**
   * Tile de água rasa da célula (`null` = mar aberto): um anel de uma célula
   * em volta da terra, desenhado sob ela. Também aceita células fora da arena.
   */
  shallowAt(col: number, row: number): GroundTile | null;
  /** Fortes e enfeites desenhados por cima do chão (só dentro da arena). */
  readonly overlays: readonly OverlayTile[];
  readonly islands: readonly Polygon[];
  readonly playerSpawn: Point;
  readonly enemySpawns: readonly Point[];
}

function isLandStyle(char: string): char is LandStyle {
  return char === "s" || char === "g";
}

function cellCenter(col: number, row: number): Point {
  return { x: (col + 0.5) * TILE_SIZE, y: (row + 0.5) * TILE_SIZE };
}

export function buildTileMap(def: TileMapDefinition): TileMap {
  const fail = (message: string): never => {
    throw new Error(`Tile map "${def.name}": ${message}`);
  };

  const rows = def.grid.length;
  const cols = def.grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) fail("grid is empty");

  const playerSpawns: Point[] = [];
  const enemySpawns: Point[] = [];

  def.grid.forEach((line, row) => {
    if (line.length !== cols) {
      fail(`row ${row} has ${line.length} columns, expected ${cols}`);
    }
    [...line].forEach((char, col) => {
      if (char === "P") {
        playerSpawns.push(cellCenter(col, row));
      } else if (char === "E") {
        enemySpawns.push(cellCenter(col, row));
      } else if (!WATER_CHARS.has(char) && !isLandStyle(char)) {
        fail(`unknown character "${char}" at ${col},${row}`);
      }
    });
  });

  const [playerSpawn] = playerSpawns;
  if (!playerSpawn || playerSpawns.length > 1) {
    fail(`expected exactly one player spawn (P), found ${playerSpawns.length}`);
  }
  if (enemySpawns.length === 0) fail("missing enemy spawns (E)");

  const charAt = (col: number, row: number) => def.grid[row]![col]!;
  const inside = (col: number, row: number) =>
    col >= 0 && col < cols && row >= 0 && row < rows;
  const isLand = (col: number, row: number) =>
    inside(col, row) && isLandStyle(charAt(col, row));

  // Fora da grade, repete a borda mais próxima: costas encostadas na borda
  // continuam para fora da arena, sem contorno.
  const clamp = (value: number, max: number) =>
    Math.min(max - 1, Math.max(0, value));
  const charAtClamped = (col: number, row: number) =>
    charAt(clamp(col, cols), clamp(row, rows));

  // Lados voltados para fora da região (água ou outro estilo). Numa faixa de
  // uma célula só, topo/esquerda têm prioridade.
  const sidesAt = (col: number, row: number): CellSides => {
    const char = charAtClamped(col, row);
    const same = (c: number, r: number) => charAtClamped(c, r) === char;
    const top = !same(col, row - 1);
    const left = !same(col - 1, row);
    return {
      top,
      bottom: !top && !same(col, row + 1),
      left,
      right: !left && !same(col + 1, row),
    };
  };

  const features = resolveFeatures({
    features: def.features,
    cols,
    rows,
    styleAt: (col, row) => {
      const char = charAt(col, row);
      return isLandStyle(char) ? char : null;
    },
    sidesAt,
    fail,
  });

  const groundAt = (col: number, row: number): GroundTile | null => {
    if (inside(col, row)) {
      const special = features.ground.get(row * cols + col);
      if (special) return special;
    }
    const char = charAtClamped(col, row);
    if (!isLandStyle(char)) return null;
    return resolveLandTile(LAND_STYLES[char], col, row, sidesAt(col, row));
  };

  // Água rasa: a terra dilatada em uma célula (8 vizinhos).
  const isShallow = (col: number, row: number) => {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (isLandStyle(charAtClamped(col + dc, row + dr))) return true;
      }
    }
    return false;
  };
  const shallowAt = (col: number, row: number): GroundTile | null => {
    if (!isShallow(col, row)) return null;
    // Mesma prioridade de `sidesAt` para faixas de uma célula só.
    const top = !isShallow(col, row - 1);
    const left = !isShallow(col - 1, row);
    return resolvePlainTile(SHALLOW_PIECES, {
      top,
      bottom: !top && !isShallow(col, row + 1),
      left,
      right: !left && !isShallow(col + 1, row),
    });
  };

  return {
    name: def.name,
    author: def.author,
    cols,
    rows,
    tileSize: TILE_SIZE,
    width: cols * TILE_SIZE,
    height: rows * TILE_SIZE,
    waterTile: WATER_TILE,
    groundAt,
    shallowAt,
    overlays: features.overlays,
    islands: buildIslandPolygons(cols, rows, isLand, groundAt),
    playerSpawn: playerSpawn!,
    enemySpawns,
  };
}

// Células de canto usam o contorno arredondado da própria arte; o resto da
// terra é decomposto em retângulos máximos (corrida horizontal estendida para
// baixo). Todos são convexos, o que simplifica a colisão círculo/polígono.
function buildIslandPolygons(
  cols: number,
  rows: number,
  isLand: (col: number, row: number) => boolean,
  groundAt: (col: number, row: number) => GroundTile | null,
): Polygon[] {
  const polygons: Polygon[] = [];
  const used = new Set<number>();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ground = isLand(col, row) ? groundAt(col, row) : null;
      const outline = ground && CORNER_OUTLINES.get(ground.tile);
      if (!ground || !outline) continue;
      used.add(row * cols + col);
      const { flipX, flipY } = ground;
      const scale = TILE_SIZE / OUTLINE_TILE_SIZE;
      const points = outline.map(([x, y]) => ({
        x: col * TILE_SIZE + (flipX ? TILE_SIZE - x * scale : x * scale),
        y: row * TILE_SIZE + (flipY ? TILE_SIZE - y * scale : y * scale),
      }));
      // Um espelhamento só inverte o sentido dos vértices.
      polygons.push(flipX !== flipY ? points.reverse() : points);
    }
  }

  const free = (col: number, row: number) =>
    isLand(col, row) && !used.has(row * cols + col);
  // Só recua lados totalmente voltados para água (não para terra nem borda).
  const facesWater = (
    fromCol: number,
    toCol: number,
    fromRow: number,
    toRow: number,
  ) => {
    for (let row = fromRow; row <= toRow; row++) {
      for (let col = fromCol; col <= toCol; col++) {
        if (col < 0 || col >= cols || row < 0 || row >= rows) return false;
        if (isLand(col, row)) return false;
      }
    }
    return true;
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!free(col, row)) continue;

      let width = 1;
      while (free(col + width, row)) width++;
      let height = 1;
      const rowIsFree = (r: number) => {
        for (let c = col; c < col + width; c++) if (!free(c, r)) return false;
        return true;
      };
      while (row + height < rows && rowIsFree(row + height)) height++;

      for (let r = row; r < row + height; r++) {
        for (let c = col; c < col + width; c++) used.add(r * cols + c);
      }

      const right = col + width - 1;
      const bottom = row + height - 1;
      const inset = (water: boolean) => (water ? COAST_INSET_PX : 0);
      const left =
        col * TILE_SIZE + inset(facesWater(col - 1, col - 1, row, bottom));
      const top =
        row * TILE_SIZE + inset(facesWater(col, right, row - 1, row - 1));
      const rightX =
        (right + 1) * TILE_SIZE -
        inset(facesWater(right + 1, right + 1, row, bottom));
      const bottomY =
        (bottom + 1) * TILE_SIZE -
        inset(facesWater(col, right, bottom + 1, bottom + 1));

      polygons.push([
        { x: left, y: top },
        { x: rightX, y: top },
        { x: rightX, y: bottomY },
        { x: left, y: bottomY },
      ]);
    }
  }
  return polygons;
}

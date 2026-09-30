import type { CellSides, GroundTile } from "./autotile";

export type LandStyle = "s" | "g";

export interface OverlayTile {
  readonly col: number;
  readonly row: number;
  readonly tile: number;
}

export interface FeatureContext {
  readonly features: readonly string[];
  readonly cols: number;
  readonly rows: number;
  styleAt(col: number, row: number): LandStyle | null;
  sidesAt(col: number, row: number): CellSides;
  fail(message: string): never;
}

export interface ResolvedFeatures {
  readonly ground: ReadonlyMap<number, GroundTile>;
  readonly overlays: readonly OverlayTile[];
}

const TOWER = "O";
const TOWER_HATCH = "Q";
const WALL = "#";
const GATE = "=";
const RUIN = "%";
const WIDE_WALL = "+";
const CANNONS: Readonly<Record<string, { tile: number; vertical: boolean }>> = {
  "^": { tile: 47, vertical: false },
  v: { tile: 48, vertical: false },
  ">": { tile: 31, vertical: true },
  "<": { tile: 32, vertical: true },
};
const STRUCTURES = new Set([
  TOWER,
  TOWER_HATCH,
  WALL,
  GATE,
  RUIN,
  WIDE_WALL,
  ...Object.keys(CANNONS),
]);

const N = 1;
const E = 2;
const S = 4;
const W = 8;

const TOWER_BY_MASK: Readonly<Record<number, number>> = {
  0: 13,
  [N]: 61,
  [E]: 46,
  [S]: 45,
  [W]: 62,
  [N | S]: 29,
  [E | W]: 30,
  [E | S]: 77,
  [S | W]: 78,
  [N | E]: 93,
  [N | W]: 94,
};

const BEACH: Readonly<Record<string, Readonly<Record<LandStyle, number>>>> = {
  b: { s: 81, g: 82 },
  k: { s: 83, g: 84 },
  R: { s: 85, g: 86 },
};

const PROPS: Readonly<Record<string, readonly number[]>> = {
  r: [49, 50, 51], // Rocks.
  m: [65, 66, 67], // Mossy rocks.
  l: [70, 71, 72], // Foliage.
  f: [87, 88], // Sprouts.
};

const EMPTY = ".";

/** Places structures and props from the map's overlay layer. */
export function resolveFeatures(ctx: FeatureContext): ResolvedFeatures {
  const { features, cols, rows, fail } = ctx;
  if (features.length !== rows) {
    fail(`features has ${features.length} rows, expected ${rows}`);
  }
  features.forEach((line, row) => {
    if (line.length !== cols) {
      fail(`features row ${row} has ${line.length} columns, expected ${cols}`);
    }
  });

  const charAt = (col: number, row: number) =>
    col >= 0 && col < cols && row >= 0 && row < rows
      ? features[row]![col]!
      : EMPTY;
  const isStructure = (col: number, row: number) =>
    STRUCTURES.has(charAt(col, row));

  const ground = new Map<number, GroundTile>();
  const overlays: OverlayTile[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const char = charAt(col, row);
      if (char === EMPTY) continue;
      const where = `"${char}" at ${col},${row}`;
      const style = ctx.styleAt(col, row) ?? fail(`${where} must be on land`);

      if (STRUCTURES.has(char)) {
        const mask =
          (isStructure(col, row - 1) ? N : 0) |
          (isStructure(col + 1, row) ? E : 0) |
          (isStructure(col, row + 1) ? S : 0) |
          (isStructure(col - 1, row) ? W : 0);
        overlays.push({
          col,
          row,
          tile: structureTile(char, mask, col, row, where),
        });
        continue;
      }

      const beach = BEACH[char];
      if (beach) {
        ground.set(row * cols + col, {
          tile: beach[style],
          flipX: false,
          flipY: false,
          rotation: beachRotation(ctx.sidesAt(col, row), where),
        });
        continue;
      }

      const variants = PROPS[char];
      if (!variants) fail(`unknown feature ${where}`);
      overlays.push({
        col,
        row,
        tile: variants[(col + row * 2) % variants.length]!,
      });
    }
  }

  return { ground, overlays };

  function structureTile(
    char: string,
    mask: number,
    col: number,
    row: number,
    where: string,
  ): number {
    if (char === TOWER || char === TOWER_HATCH) {
      if (mask === 0 && char === TOWER_HATCH) return 14;
      const tile = TOWER_BY_MASK[mask];
      if (tile === undefined)
        fail(`${where}: towers connect to at most 2 walls`);
      return tile;
    }

    const vertical = (mask & (N | S)) !== 0;
    const horizontal = (mask & (E | W)) !== 0;
    if (vertical && horizontal) {
      fail(`${where}: wall junctions and corners need a tower (O)`);
    }

    const cannon = CANNONS[char];
    if (cannon) {
      if (cannon.vertical ? horizontal : vertical) {
        fail(`${where}: cannon direction does not match the wall`);
      }
      return cannon.tile;
    }
    if (!vertical && !horizontal) fail(`${where}: wall is not connected`);

    switch (char) {
      case GATE:
        return vertical ? 60 : 76;
      case WIDE_WALL:
        return vertical ? 95 : 96;
      case RUIN:
        return vertical ? [89, 91][row % 2]! : [90, 92][col % 2]!;
      default:
        if (vertical) {
          if ((mask & (N | S)) === (N | S)) return 15;
          return mask & S ? 63 : 79;
        }
        if ((mask & (E | W)) === (E | W)) return 16;
        return mask & E ? 64 : 80;
    }
  }

  function beachRotation(sides: CellSides, where: string): number {
    const open = [sides.bottom, sides.left, sides.top, sides.right];
    if (open.filter(Boolean).length !== 1) {
      fail(
        `${where} must be on a straight coast (exactly one side facing water)`,
      );
    }
    return open.indexOf(true);
  }
}

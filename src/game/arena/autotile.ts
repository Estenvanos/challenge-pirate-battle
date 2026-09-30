type Pair = readonly [number, number];

/** Tiles cut from one land-style block; edge and center art align by phase. */
export interface LandPieces {
  readonly corners: {
    readonly topLeft: number;
    readonly topRight: number;
    readonly bottomLeft: number;
    readonly bottomRight: number;
  };
  readonly top: Pair;
  readonly bottom: Pair;
  readonly left: Pair;
  readonly right: Pair;
  readonly center: readonly [Pair, Pair];
}

export const SAND_PIECES: LandPieces = {
  corners: { topLeft: 1, topRight: 3, bottomLeft: 33, bottomRight: 35 },
  top: [2, 2],
  bottom: [34, 34],
  left: [17, 17],
  right: [19, 19],
  center: [
    [18, 18],
    [18, 18],
  ],
};

export const GRASS_PIECES: LandPieces = {
  corners: { topLeft: 6, topRight: 9, bottomLeft: 54, bottomRight: 57 },
  top: [7, 8],
  bottom: [55, 56],
  left: [22, 38],
  right: [25, 41],
  center: [
    [23, 24],
    [39, 40],
  ],
};

export const SHALLOW_PIECES: LandPieces = {
  corners: { topLeft: 10, topRight: 12, bottomLeft: 42, bottomRight: 44 },
  top: [11, 11],
  bottom: [43, 43],
  left: [26, 26],
  right: [28, 28],
  center: [
    [27, 27],
    [27, 27],
  ],
};

type Outline = readonly (readonly [number, number])[];

/** Source-art size used when measuring the corner collision outlines. */
export const OUTLINE_TILE_SIZE = 64;

// Convex outlines follow each rounded corner's alpha; sand and grass share them.
const TOP_LEFT: Outline = [
  [4, 31],
  [12, 19],
  [50, 4],
  [64, 2],
  [64, 64],
  [1, 64],
];
const TOP_RIGHT: Outline = [
  [0, 1],
  [33, 4],
  [44, 11],
  [53, 28],
  [62, 59],
  [62, 64],
  [0, 64],
];
const BOTTOM_LEFT: Outline = [
  [2, 0],
  [64, 0],
  [64, 63],
  [35, 61],
  [22, 55],
  [11, 36],
  [2, 5],
];
const BOTTOM_RIGHT: Outline = [
  [0, 0],
  [63, 0],
  [61, 29],
  [52, 45],
  [36, 53],
  [5, 62],
  [0, 62],
];

export const CORNER_OUTLINES: ReadonlyMap<number, Outline> = new Map(
  [SAND_PIECES, GRASS_PIECES].flatMap(({ corners }) => [
    [corners.topLeft, TOP_LEFT],
    [corners.topRight, TOP_RIGHT],
    [corners.bottomLeft, BOTTOM_LEFT],
    [corners.bottomRight, BOTTOM_RIGHT],
  ]),
);

export interface GroundTile {
  readonly tile: number;
  readonly flipX: boolean;
  readonly flipY: boolean;
  readonly rotation: number;
}

export interface CellSides {
  readonly top: boolean;
  readonly bottom: boolean;
  readonly left: boolean;
  readonly right: boolean;
}

export function isCornerOrCenter({ top, bottom, left, right }: CellSides) {
  const vertical = top || bottom;
  const horizontal = left || right;
  return { corner: vertical && horizontal, center: !vertical && !horizontal };
}

// Four-cell phase: original pair, then its mirror, so center tiles meet cleanly.
const mod4 = (value: number) => ((value % 4) + 4) % 4;
const phase = (value: number) => {
  const p = mod4(value);
  return { index: p === 0 || p === 3 ? 0 : 1, flip: p >= 2 } as const;
};

type Band = "start" | "middle" | "end";

/** Matches a border tile to the current phase of the neighboring center. */
function resolveAxis(
  coord: number,
  atStart: boolean,
  atEnd: boolean,
): { band: Band; flip: boolean; index: 0 | 1 } {
  const along = phase(coord);
  if (atStart) {
    const original = mod4(coord + 1) < 2;
    return { band: original ? "start" : "end", flip: !original, index: 0 };
  }
  if (atEnd) {
    const original = mod4(coord - 1) < 2;
    return { band: original ? "end" : "start", flip: !original, index: 0 };
  }
  return { band: "middle", flip: along.flip, index: along.index };
}

export function resolvePlainTile(
  pieces: LandPieces,
  { top, bottom, left, right }: CellSides,
): GroundTile {
  const { corners } = pieces;
  let tile = pieces.center[0][0];
  if (top)
    tile = left ? corners.topLeft : right ? corners.topRight : pieces.top[0];
  else if (bottom)
    tile = left
      ? corners.bottomLeft
      : right
        ? corners.bottomRight
        : pieces.bottom[0];
  else if (left) tile = pieces.left[0];
  else if (right) tile = pieces.right[0];
  return { tile, flipX: false, flipY: false, rotation: 0 };
}

/** Chooses a coast or center tile with matching mirrored edges. */
export function resolveLandTile(
  pieces: LandPieces,
  col: number,
  row: number,
  sides: CellSides,
): GroundTile {
  const x = resolveAxis(col, sides.left, sides.right);
  const y = resolveAxis(row, sides.top, sides.bottom);
  const xIndex = phase(col).index;
  const yIndex = phase(row).index;

  let tile: number;
  if (y.band === "middle" && x.band === "middle") {
    tile = pieces.center[yIndex][xIndex];
  } else if (y.band === "middle") {
    tile = (x.band === "start" ? pieces.left : pieces.right)[yIndex];
  } else if (x.band === "middle") {
    tile = (y.band === "start" ? pieces.top : pieces.bottom)[xIndex];
  } else {
    const { corners } = pieces;
    tile =
      y.band === "start"
        ? x.band === "start"
          ? corners.topLeft
          : corners.topRight
        : x.band === "start"
          ? corners.bottomLeft
          : corners.bottomRight;
  }
  return { tile, flipX: x.flip, flipY: y.flip, rotation: 0 };
}

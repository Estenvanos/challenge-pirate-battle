// Escolha do tile de chão de cada célula de terra a partir dos vizinhos.
// Módulo puro (sem Pixi/DOM).

type Pair = readonly [number, number];

/**
 * Peças de um estilo de terra, tiradas de um bloco desenhado inteiro.
 * Bordas e miolo são pares contínuos no desenho: `top`/`bottom` variam por
 * coluna, `left`/`right` por linha, e o miolo é um bloco 2×2.
 */
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

// Ilha de areia 3×3 (tiles 1–35): o desenho não varia no meio.
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

// Ilha com grama 4×4 (tiles 6–57).
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

// Água rasa 3×3 (tiles 10–44): branco translúcido desenhado em volta da terra.
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

/** Lado do tile (px) em que os contornos abaixo foram medidos. */
export const OUTLINE_TILE_SIZE = 64;

// Contorno convexo da terra em cada peça de canto (px do tile, sentido
// horário), medido no alfa da arte. Os cantos são arredondados e cada um tem
// uma curva diferente; areia e grama compartilham o mesmo contorno.
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

/** Contorno de colisão por tile de canto (sem espelhamento aplicado). */
export const CORNER_OUTLINES: ReadonlyMap<number, Outline> = new Map(
  [SAND_PIECES, GRASS_PIECES].flatMap(({ corners }) => [
    [corners.topLeft, TOP_LEFT],
    [corners.topRight, TOP_RIGHT],
    [corners.bottomLeft, BOTTOM_LEFT],
    [corners.bottomRight, BOTTOM_RIGHT],
  ]),
);

/** Tile de chão resolvido: espelhamento nos eixos e giro em quartos de volta. */
export interface GroundTile {
  readonly tile: number;
  readonly flipX: boolean;
  readonly flipY: boolean;
  /** Quartos de volta no sentido horário (0–3). */
  readonly rotation: number;
}

/** Lados da célula voltados para fora da região (água ou outro estilo). */
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

// Fase no período de 4 células: a, b, b espelhado, a espelhado. Assim todo
// tile do miolo encosta no vizinho original do desenho ou na própria imagem
// espelhada, sem emendas (repetir o mesmo tile deixava cada quadrado visível).
const mod4 = (value: number) => ((value % 4) + 4) % 4;
const phase = (value: number) => {
  const p = mod4(value);
  return { index: p === 0 || p === 3 ? 0 : 1, flip: p >= 2 } as const;
};

type Band = "start" | "middle" | "end";

/**
 * Resolve um eixo. Numa borda, a peça original casa com o miolo vizinho quando
 * ele está nas fases 0–1; nas fases 2–3 (miolo espelhado) casa a peça do lado
 * oposto, espelhada. `start` = esquerda/topo, `end` = direita/base.
 */
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

/**
 * Peça pela posição na região, sem espelhar nem alternar: serve a desenhos
 * uniformes, como a água rasa.
 */
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

export function resolveLandTile(
  pieces: LandPieces,
  col: number,
  row: number,
  sides: CellSides,
): GroundTile {
  const x = resolveAxis(col, sides.left, sides.right);
  const y = resolveAxis(row, sides.top, sides.bottom);
  // Nas bordas, a peça ao longo do eixo segue a fase da própria célula.
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

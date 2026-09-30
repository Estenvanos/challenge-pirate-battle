import type { Point } from "../arena";

/** Grade de navegação: quais células são água. */
export interface NavGrid {
  readonly cols: number;
  readonly rows: number;
  readonly tileSize: number;
  /** `true` onde um navio pode passar. */
  readonly water: readonly boolean[];
}

/**
 * Campo de fluxo até o jogador: distância em passos (BFS) de cada célula de
 * água até a célula do jogador. Todos os inimigos compartilham o mesmo campo;
 * ele só é refeito quando o jogador muda de célula.
 */
export interface FlowField {
  targetCell: number;
  /** Passos até o alvo; -1 = inalcançável ou terra. */
  readonly distance: Int16Array;
}

// Vizinhança de 8 células; diagonais só quando as duas ortogonais são água,
// para o navio não cortar a quina de uma ilha.
const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

export function createNavGrid(map: {
  readonly cols: number;
  readonly rows: number;
  readonly tileSize: number;
  groundAt(col: number, row: number): unknown;
}): NavGrid {
  const water: boolean[] = [];
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      water.push(map.groundAt(col, row) === null);
    }
  }
  return { cols: map.cols, rows: map.rows, tileSize: map.tileSize, water };
}

export function cellAt(grid: NavGrid, point: Point): number {
  const col = Math.min(
    grid.cols - 1,
    Math.max(0, Math.floor(point.x / grid.tileSize)),
  );
  const row = Math.min(
    grid.rows - 1,
    Math.max(0, Math.floor(point.y / grid.tileSize)),
  );
  return row * grid.cols + col;
}

export function cellCenter(grid: NavGrid, cell: number): Point {
  return {
    x: ((cell % grid.cols) + 0.5) * grid.tileSize,
    y: (Math.floor(cell / grid.cols) + 0.5) * grid.tileSize,
  };
}

function forEachNeighbour(
  grid: NavGrid,
  cell: number,
  visit: (neighbour: number) => void,
): void {
  const col = cell % grid.cols;
  const row = Math.floor(cell / grid.cols);
  const isWater = (c: number, r: number) =>
    c >= 0 &&
    r >= 0 &&
    c < grid.cols &&
    r < grid.rows &&
    grid.water[r * grid.cols + c];
  for (const [dc, dr] of NEIGHBOURS) {
    if (!isWater(col + dc, row + dr)) continue;
    if (dc !== 0 && dr !== 0) {
      if (!isWater(col + dc, row) || !isWater(col, row + dr)) continue;
    }
    visit((row + dr) * grid.cols + col + dc);
  }
}

export function createFlowField(grid: NavGrid): FlowField {
  return {
    targetCell: -1,
    distance: new Int16Array(grid.cols * grid.rows).fill(-1),
  };
}

/** Refaz o BFS se o alvo mudou de célula. */
export function updateFlowField(
  field: FlowField,
  grid: NavGrid,
  target: Point,
): void {
  const targetCell = cellAt(grid, target);
  if (targetCell === field.targetCell) return;
  field.targetCell = targetCell;
  field.distance.fill(-1);
  field.distance[targetCell] = 0;
  const queue = [targetCell];
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    forEachNeighbour(grid, cell, (neighbour) => {
      if (field.distance[neighbour] !== -1) return;
      field.distance[neighbour] = field.distance[cell] + 1;
      queue.push(neighbour);
    });
  }
}

/**
 * Ponto para onde navegar: desce o campo `lookahead` células a partir da
 * posição atual. `null` quando já está perto do alvo (ou sem caminho), e
 * então o inimigo mira direto no jogador.
 */
export function nextWaypoint(
  field: FlowField,
  grid: NavGrid,
  from: Point,
  lookahead: number,
): Point | null {
  let cell = cellAt(grid, from);
  if (field.distance[cell] <= lookahead) return null;
  for (let step = 0; step < lookahead; step++) {
    let best = cell;
    forEachNeighbour(grid, cell, (neighbour) => {
      const d = field.distance[neighbour];
      if (d !== -1 && d < field.distance[best]) best = neighbour;
    });
    cell = best;
  }
  return cellCenter(grid, cell);
}

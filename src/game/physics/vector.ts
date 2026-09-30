export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;

export function normalize(x: number, y: number): Vec2 {
  const length = Math.hypot(x, y);
  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}

export const distance = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.y - a.y);

export const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * t;

/** Ângulo (rad) de `from` até `to`; 0 aponta para +x. */
export const angleTo = (from: Vec2, to: Vec2) =>
  Math.atan2(to.y - from.y, to.x - from.x);

/** Diferença `to - from` normalizada para (-π, π]: o caminho mais curto. */
export const angleDelta = (from: number, to: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

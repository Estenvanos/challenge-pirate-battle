export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;

export function normalize(x: number, y: number): Vec2 {
  const length = Math.hypot(x, y);
  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}

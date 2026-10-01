import { dot, normalize, type Vec2 } from "./vector";

export interface Penetration {
  readonly normal: Vec2;
  readonly depth: number;
}

/** SAT collision against a convex polygon; returns minimum translation. */
export function circleVsPolygon(
  center: Vec2,
  radius: number,
  polygon: readonly Vec2[],
): Penetration | null {
  const axes: Vec2[] = [];
  let closest = polygon[0];
  let closestDist = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    axes.push(normalize(b.y - a.y, a.x - b.x));
    const dist = Math.hypot(center.x - a.x, center.y - a.y);
    if (dist < closestDist) {
      closestDist = dist;
      closest = a;
    }
  }
  axes.push(normalize(center.x - closest.x, center.y - closest.y));

  let best: Penetration | null = null;
  for (const axis of axes) {
    if (axis.x === 0 && axis.y === 0) continue;
    let min = Infinity;
    let max = -Infinity;
    for (const point of polygon) {
      const projection = dot(point, axis);
      min = Math.min(min, projection);
      max = Math.max(max, projection);
    }
    const c = dot(center, axis);
    const overlap = Math.min(max - (c - radius), c + radius - min);
    if (overlap <= 0) return null; // A separating axis means no collision.
    if (!best || overlap < best.depth) {
      const pushOut = c - (min + max) / 2 >= 0 ? 1 : -1;
      best = {
        normal: { x: axis.x * pushOut, y: axis.y * pushOut },
        depth: overlap,
      };
    }
  }
  return best;
}

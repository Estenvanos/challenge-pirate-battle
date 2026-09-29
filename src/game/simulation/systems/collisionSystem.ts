import { circleVsPolygon } from "../../physics/collision";
import type { Ship } from "../entities";
import type { World } from "../World";

/**
 * Perde a parte da velocidade que ia contra o obstáculo: batida de frente
 * para o navio, raspão mantém quase tudo (ele desliza pela costa).
 */
function absorbImpact(ship: Ship, normalX: number, normalY: number): void {
  const into =
    Math.cos(ship.rotation) * normalX + Math.sin(ship.rotation) * normalY;
  if (into < 0) ship.speed *= 1 + into;
}

/**
 * Empurra o navio para fora das ilhas pelo vetor de translação mínima (ele
 * desliza ao longo da costa) e o mantém dentro dos limites da arena.
 */
export function collisionSystem(world: World): void {
  const ship = world.player;
  for (const island of world.islands) {
    const hit = circleVsPolygon(ship, ship.radius, island);
    if (!hit) continue;
    ship.x += hit.normal.x * hit.depth;
    ship.y += hit.normal.y * hit.depth;
    absorbImpact(ship, hit.normal.x, hit.normal.y);
  }

  const { width, height } = world.arena;
  const { radius } = ship;
  if (ship.x < radius) {
    ship.x = radius;
    absorbImpact(ship, 1, 0);
  } else if (ship.x > width - radius) {
    ship.x = width - radius;
    absorbImpact(ship, -1, 0);
  }
  if (ship.y < radius) {
    ship.y = radius;
    absorbImpact(ship, 0, 1);
  } else if (ship.y > height - radius) {
    ship.y = height - radius;
    absorbImpact(ship, 0, -1);
  }
}

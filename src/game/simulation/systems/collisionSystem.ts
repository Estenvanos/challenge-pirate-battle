import type { MatchConfig } from "../../../config/gameConfig";
import { circleVsPolygon } from "../../physics/collision";
import type { Ship } from "../entities";
import type { World } from "../World";

/** Removes only velocity pointing into the obstacle, allowing coast sliding. */
function absorbImpact(ship: Ship, normalX: number, normalY: number): void {
  const into =
    Math.cos(ship.rotation) * normalX + Math.sin(ship.rotation) * normalY;
  if (into < 0) ship.speed *= 1 + into;
}

export function collisionSystem(world: World, config: MatchConfig): void {
  separateShips(world, config);
  collideWithArena(world, world.player, config.player.hullHalfLength);
  for (const enemy of world.enemies) {
    const { hullHalfLength } = config.enemies.kinds[enemy.kind];
    collideWithArena(world, enemy, hullHalfLength);
  }
}

/** Separates touching ships; a ramming enemy must still reach the player. */
function separateShips(world: World, config: MatchConfig): void {
  const { player } = world;
  const ships: readonly Ship[] = [player, ...world.enemies];
  for (let i = 0; i < ships.length; i++) {
    for (let j = i + 1; j < ships.length; j++) {
      const a = ships[i];
      const b = ships[j];
      if (
        a === player &&
        config.enemies.kinds[world.enemies[j - 1].kind].ramDamage
      )
        continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const overlap = a.radius + b.radius - dist;
      if (overlap <= 0) continue;
      const nx = dist === 0 ? 1 : dx / dist;
      const ny = dist === 0 ? 0 : dy / dist;
      a.x -= (nx * overlap) / 2;
      a.y -= (ny * overlap) / 2;
      b.x += (nx * overlap) / 2;
      b.y += (ny * overlap) / 2;
    }
  }
}

function collideWithArena(
  world: World,
  ship: Ship,
  hullHalfLength: number,
): void {
  const reach = Math.max(0, hullHalfLength - ship.radius);
  const dirX = Math.cos(ship.rotation);
  const dirY = Math.sin(ship.rotation);
  for (const island of world.islands) {
    for (const along of [-reach, 0, reach]) {
      const probe = { x: ship.x + dirX * along, y: ship.y + dirY * along };
      const hit = circleVsPolygon(probe, ship.radius, island);
      if (!hit) continue;
      ship.x += hit.normal.x * hit.depth;
      ship.y += hit.normal.y * hit.depth;
      absorbImpact(ship, hit.normal.x, hit.normal.y);
    }
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

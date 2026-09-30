import type { MatchConfig } from "../../../config/gameConfig";
import { circleVsPolygon } from "../../physics/collision";
import type { Projectile } from "../entities";
import type { World } from "../World";

function isGone(world: World, projectile: Projectile, range: number): boolean {
  const { x, y, radius } = projectile;
  const { width, height } = world.arena;
  if (projectile.travelled >= range) return true;
  if (x < -radius || y < -radius || x > width + radius || y > height + radius)
    return true;
  return world.islands.some((island) =>
    circleVsPolygon(projectile, radius, island),
  );
}

/** Move os projéteis e remove os que passaram do alcance, saíram da arena ou bateram numa ilha. */
export function projectileSystem(
  world: World,
  dt: number,
  config: MatchConfig,
): void {
  for (const projectile of world.projectiles) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.travelled += config.projectile.speed * dt;
  }
  world.projectiles = world.projectiles.filter(
    (projectile) => !isGone(world, projectile, config.projectile.range),
  );
}

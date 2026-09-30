import type { ProjectileSpec } from "../../../config/enemies";
import type { MatchConfig } from "../../../config/gameConfig";
import { circleVsPolygon } from "../../physics/collision";
import type { Projectile, Ship } from "../entities";
import type { World, WorldEvent } from "../World";
import { applyDamage } from "./damageSystem";

type EndCause = Extract<WorldEvent, { type: "projectileEnded" }>["cause"];

/** Cria um projétil em (x, y) voando na direção `angle` (rad). */
export function spawnProjectile(
  world: World,
  owner: Projectile["owner"],
  x: number,
  y: number,
  angle: number,
  spec: ProjectileSpec,
  config: MatchConfig,
): void {
  world.projectiles.push({
    id: `projectile-${world.nextId++}`,
    owner,
    x,
    y,
    prevX: x,
    prevY: y,
    vx: Math.cos(angle) * spec.speed,
    vy: Math.sin(angle) * spec.speed,
    travelled: 0,
    range: spec.range,
    damage: spec.damage,
    radius: config.projectile.radius,
  });
}

/**
 * O casco é uma cápsula: o segmento entre popa e proa, engrossado pelo raio
 * (a mesma forma dos três círculos da colisão com ilhas).
 */
export function hitsShip(
  projectile: {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
  },
  ship: Ship,
  hullHalfLength: number,
): boolean {
  const reach = Math.max(0, hullHalfLength - ship.radius);
  const dirX = Math.cos(ship.rotation);
  const dirY = Math.sin(ship.rotation);
  const dx = projectile.x - ship.x;
  const dy = projectile.y - ship.y;
  // Ponto do eixo do casco mais próximo do projétil.
  const along = Math.max(-reach, Math.min(reach, dx * dirX + dy * dirY));
  return (
    Math.hypot(dx - dirX * along, dy - dirY * along) <=
    ship.radius + projectile.radius
  );
}

/**
 * Por que o projétil some neste passo, ou `null` se ele segue voando. Ao
 * acertar um navio já aplica o dano: como o projétil some no mesmo passo, ele
 * fere uma única vez.
 */
function endCause(
  world: World,
  projectile: Projectile,
  config: MatchConfig,
): EndCause | null {
  const { x, y, radius } = projectile;
  const { width, height } = world.arena;
  if (x < -radius || y < -radius || x > width + radius || y > height + radius)
    return "bounds";
  // Tiro do jogador só acerta inimigos; tiro inimigo, só o jogador.
  const target =
    projectile.owner === "player"
      ? world.enemies.find(
          (enemy) =>
            // Quem já foi a 0 neste passo não absorve mais tiros.
            enemy.hp > 0 &&
            hitsShip(
              projectile,
              enemy,
              config.enemies.kinds[enemy.kind].hullHalfLength,
            ),
        )
      : hitsShip(projectile, world.player, config.player.hullHalfLength)
        ? world.player
        : undefined;
  if (target) {
    applyDamage(world, target, projectile.damage, x, y);
    return "ship";
  }
  if (
    world.islands.some((island) => circleVsPolygon(projectile, radius, island))
  )
    return "island";
  if (projectile.travelled >= projectile.range) return "range";
  return null;
}

/** Move os projéteis e remove os que passaram do alcance, saíram da arena ou bateram numa ilha ou num navio. */
export function projectileSystem(
  world: World,
  dt: number,
  config: MatchConfig,
): void {
  world.projectiles = world.projectiles.filter((projectile) => {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.travelled += Math.hypot(projectile.vx, projectile.vy) * dt;
    const cause = endCause(world, projectile, config);
    if (!cause) return true;
    const { x, y } = projectile;
    world.events.push({ type: "projectileEnded", cause, x, y });
    return false;
  });
}

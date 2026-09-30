import type { ProjectileSpec } from "../../../config/enemies";
import type { MatchConfig } from "../../../config/gameConfig";
import { angleDelta, angleTo, distance } from "../../physics/vector";
import type { Enemy } from "../entities";
import type { World } from "../World";
import { spawnProjectile } from "./projectileSystem";

function fireFront(
  world: World,
  enemy: Enemy,
  spec: ProjectileSpec,
  config: MatchConfig,
): void {
  // Nasce na proa, para não sair de dentro do casco.
  const { hullHalfLength } = config.enemies.kinds[enemy.kind];
  const x = enemy.x + Math.cos(enemy.rotation) * hullHalfLength;
  const y = enemy.y + Math.sin(enemy.rotation) * hullHalfLength;
  spawnProjectile(world, "enemy", x, y, enemy.rotation, spec, config);
  world.events.push({
    type: "shotFired",
    weapon: "front",
    shipId: enemy.id,
    x,
    y,
    angle: enemy.rotation,
    shots: 1,
  });
}

/**
 * Inimigo armado dispara um projétil frontal quando o jogador está no alcance
 * e a proa aponta para ele, respeitando o próprio cooldown.
 */
export function enemyWeaponSystem(
  world: World,
  dt: number,
  config: MatchConfig,
): void {
  const { player } = world;
  for (const enemy of world.enemies) {
    const { weapon } = config.enemies.kinds[enemy.kind];
    if (!weapon) continue;
    const { attackRange, aimTolerance, fireCooldownSec } = weapon;
    enemy.fireCooldown = Math.max(0, enemy.fireCooldown - dt);
    if (enemy.fireCooldown > 0) continue;
    if (distance(enemy, player) > attackRange) continue;
    const aimError = angleDelta(enemy.rotation, angleTo(enemy, player));
    if (Math.abs(aimError) > aimTolerance) continue;
    fireFront(world, enemy, weapon.projectile, config);
    enemy.fireCooldown = fireCooldownSec;
  }
}

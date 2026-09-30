import type { MatchConfig } from "../../../config/gameConfig";
import { angleDelta, angleTo, distance } from "../../physics/vector";
import type { Enemy } from "../entities";
import type { World } from "../World";

function fireFront(world: World, enemy: Enemy, config: MatchConfig): void {
  const { speed, radius } = config.projectile;
  const dirX = Math.cos(enemy.rotation);
  const dirY = Math.sin(enemy.rotation);
  // Nasce na proa, para não sair de dentro do casco.
  world.projectiles.push({
    id: `projectile-${world.nextId++}`,
    x: enemy.x + dirX * enemy.radius,
    y: enemy.y + dirY * enemy.radius,
    vx: dirX * speed,
    vy: dirY * speed,
    travelled: 0,
    radius,
  });
}

/**
 * Shooter dispara um projétil frontal quando o jogador está no alcance e a
 * proa aponta para ele, respeitando o próprio cooldown.
 */
export function enemyWeaponSystem(
  world: World,
  dt: number,
  config: MatchConfig,
): void {
  const { player } = world;
  const { attackRange, aimTolerance, fireCooldownSec } = config.enemies.shooter;
  for (const enemy of world.enemies) {
    if (enemy.kind !== "shooter") continue;
    enemy.fireCooldown = Math.max(0, enemy.fireCooldown - dt);
    if (enemy.fireCooldown > 0) continue;
    if (distance(enemy, player) > attackRange) continue;
    const aimError = angleDelta(enemy.rotation, angleTo(enemy, player));
    if (Math.abs(aimError) > aimTolerance) continue;
    fireFront(world, enemy, config);
    enemy.fireCooldown = fireCooldownSec;
  }
}

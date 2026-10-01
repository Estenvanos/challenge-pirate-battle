import type { MatchConfig } from "../../../config/gameConfig";
import type { Ship } from "../entities";
import type { World } from "../World";
import { hitsShip } from "./projectileSystem";

export function applyDamage(
  world: World,
  ship: Ship,
  amount: number,
  x: number,
  y: number,
): void {
  ship.hp = Math.max(0, ship.hp - amount);
  world.events.push({ type: "shipDamaged", shipId: ship.id, x, y });
}

/** Resolves rams, removes destroyed enemies and awards shot-only points. */
export function damageSystem(world: World, config: MatchConfig): void {
  const { player } = world;
  const rammed = new Set<string>();
  for (const enemy of world.enemies) {
    const { ramDamage, hullHalfLength } = config.enemies.kinds[enemy.kind];
    if (!ramDamage || enemy.hp <= 0) continue;
    const reach = Math.max(0, hullHalfLength - enemy.radius);
    const dirX = Math.cos(enemy.rotation);
    const dirY = Math.sin(enemy.rotation);
    const probe = [reach, 0, -reach]
      .map((along) => ({
        x: enemy.x + dirX * along,
        y: enemy.y + dirY * along,
        radius: enemy.radius,
      }))
      .find((circle) => hitsShip(circle, player, config.player.hullHalfLength));
    if (!probe) continue;
    applyDamage(
      world,
      player,
      ramDamage,
      (probe.x + player.x) / 2,
      (probe.y + player.y) / 2,
    );
    enemy.hp = 0;
    rammed.add(enemy.id);
  }

  world.enemies = world.enemies.filter((enemy) => {
    if (enemy.hp > 0) return true;
    enemy.speed = 0;
    const cause = rammed.has(enemy.id) ? "ram" : "shot";
    if (cause === "shot") {
      world.score += 1;
      const { everyKills, amount } = config.player.repair;
      const damaged = player.hp > 0 && player.hp < player.maxHp;
      if (world.score % everyKills === 0 && damaged) {
        player.hp = Math.min(player.maxHp, player.hp + amount);
        world.events.push({ type: "playerRepaired" });
      }
    }
    world.events.push({
      type: "enemyDestroyed",
      id: enemy.id,
      x: enemy.x,
      y: enemy.y,
      cause,
    });
    return false;
  });

  if (player.hp <= 0) {
    player.speed = 0;
    world.endReason = "playerDestroyed";
    world.events.push({ type: "playerDestroyed", x: player.x, y: player.y });
  }
}

import type { MatchConfig } from "../../../config/gameConfig";
import type { Ship } from "../entities";
import type { World } from "../World";
import { hitsShip } from "./projectileSystem";

/** Tira `amount` de vida do navio; (x, y) é o ponto do impacto. */
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

/**
 * Abalroada: o inimigo com `ramDamage` que encosta no jogador o fere e explode.
 * Depois, quem ficou sem vida sai do World (deixa de atirar, colidir e causar
 * dano), e a partida termina se foi o jogador.
 */
export function damageSystem(world: World, config: MatchConfig): void {
  const { player } = world;
  const rammed = new Set<string>();
  for (const enemy of world.enemies) {
    const { ramDamage, hullHalfLength } = config.enemies.kinds[enemy.kind];
    if (!ramDamage || enemy.hp <= 0) continue;
    // Os três círculos do casco do inimigo contra a cápsula do jogador.
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
    // Impacto no meio do caminho entre os dois cascos.
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
    // Parado: a view ainda desenha o naufrágio a partir deste estado.
    enemy.speed = 0;
    const cause = rammed.has(enemy.id) ? "ram" : "shot";
    // Só tiro do jogador pontua; o inimigo sai do World aqui, então conta uma vez.
    if (cause === "shot") {
      world.score += 1;
      // Reparo a cada tantos inimigos destruídos. Um navio já sem vida não
      // revive, e com a vida cheia não há o que reparar.
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

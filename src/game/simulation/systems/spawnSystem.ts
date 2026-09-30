import type { MatchConfig } from "../../../config/gameConfig";
import type { Point } from "../../arena";
import { circleVsPolygon } from "../../physics/collision";
import { angleTo, distance } from "../../physics/vector";
import type { EnemyKind } from "../entities";
import type { World } from "../World";

/**
 * Pontos "E" onde um navio de raio `radius` pode nascer agora: longe do
 * jogador (sem dano imediato inevitável), sem sobrepor outro navio e sem
 * encostar em ilha.
 */
function freeSpawnPoints(
  world: World,
  radius: number,
  config: MatchConfig,
): Point[] {
  const { player, enemies, islands } = world;
  return world.enemySpawns.filter(
    (point) =>
      distance(point, player) >= config.spawn.minPlayerDistance &&
      enemies.every(
        (enemy) => distance(point, enemy) >= enemy.radius + radius,
      ) &&
      islands.every((island) => !circleVsPolygon(point, radius, island)),
  );
}

function spawnEnemy(world: World, config: MatchConfig): void {
  const kind: EnemyKind =
    world.rng.next() < config.spawn.chaserChance ? "chaser" : "shooter";
  const motion = config.enemies[kind];
  const candidates = freeSpawnPoints(world, motion.radius, config);
  // Sem ponto livre, este spawn é pulado; o próximo intervalo tenta de novo.
  if (candidates.length === 0) return;
  const point = world.rng.pick(candidates);
  world.enemies.push({
    id: `enemy-${world.nextId++}`,
    kind,
    x: point.x,
    y: point.y,
    rotation: angleTo(point, world.player),
    speed: 0,
    angularVelocity: 0,
    radius: motion.radius,
    control: { forward: false, turn: 0 },
    fireCooldown: config.enemies.shooter.fireCooldownSec,
  });
}

/** Um inimigo a cada `spawn.intervalSec` de jogo ativo. */
export function spawnSystem(
  world: World,
  dt: number,
  config: MatchConfig,
): void {
  world.spawnTimer += dt;
  while (world.spawnTimer >= config.spawn.intervalSec) {
    world.spawnTimer -= config.spawn.intervalSec;
    spawnEnemy(world, config);
  }
}

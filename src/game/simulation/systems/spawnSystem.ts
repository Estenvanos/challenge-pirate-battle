import type { EnemySpec } from "../../../config/enemies";
import type { MatchConfig } from "../../../config/gameConfig";
import type { Point } from "../../arena";
import { circleVsPolygon } from "../../physics/collision";
import { angleTo, distance } from "../../physics/vector";
import type { EnemyKind } from "../entities";
import type { World } from "../World";

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

function pickKind(world: World, config: MatchConfig): EnemyKind {
  const entries = Object.entries(config.enemies.kinds) as [
    EnemyKind,
    EnemySpec,
  ][];
  const total = entries.reduce((sum, [, spec]) => sum + spec.spawnWeight, 0);
  let roll = world.rng.next() * total;
  for (const [kind, spec] of entries) {
    roll -= spec.spawnWeight;
    if (roll < 0) return kind;
  }
  return entries[entries.length - 1][0];
}

function spawnEnemy(world: World, config: MatchConfig): void {
  const kind = pickKind(world, config);
  const spec = config.enemies.kinds[kind];
  const candidates = freeSpawnPoints(world, spec.radius, config);
  if (candidates.length === 0) return;
  const point = world.rng.pick(candidates);
  const rotation = angleTo(point, world.player);
  world.enemies.push({
    id: `enemy-${world.nextId++}`,
    kind,
    x: point.x,
    y: point.y,
    rotation,
    speed: 0,
    prevX: point.x,
    prevY: point.y,
    prevRotation: rotation,
    radius: spec.radius,
    hp: spec.maxHp,
    maxHp: spec.maxHp,
    control: { throttle: 0, turn: 0 },
    fireCooldown: spec.weapon?.fireCooldownSec ?? 0,
  });
  world.events.push({ type: "enemySpawned", x: point.x, y: point.y });
}

/** Spawns only at free, distant map points after each active-time interval. */
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

// §8.5 Comportamentos de Chaser e Shooter e intervalo de spawn.
import { expect, test } from "../fixtures/test";
import { distance, SEEDS } from "../helpers/game";

test.use({
  setup: {
    seed: SEEDS.mixed,
    options: { sessionTimeSec: 60, spawnIntervalSec: 2 },
  },
});

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.play();
});

test("enemies spawn once per interval, away from the player", async ({
  game,
}) => {
  await game.advance(1.9);
  expect((await game.state()).enemies).toHaveLength(0);
  await game.advance(0.2);
  const first = await game.state();
  expect(first.enemies).toHaveLength(1);
  expect(distance(first.player, first.enemies[0])).toBeGreaterThanOrEqual(700);
  await game.advance(2);
  expect((await game.state()).enemies).toHaveLength(2);
});

test("a chaser hunts the player and explodes on impact without scoring", async ({
  game,
}) => {
  const spawned = await game.advanceUntil(
    (s) => s.enemies.some((e) => e.kind === "chaser"),
    {
      maxSec: 10,
    },
  );
  const chaser = spawned.enemies.find((e) => e.kind === "chaser")!;
  await game.advance(2);
  const closer = (await game.state()).enemies.find((e) => e.id === chaser.id)!;
  expect(distance(closer, spawned.player)).toBeLessThan(
    distance(chaser, spawned.player),
  );

  const rammed = await game.advanceUntil(
    (s) => !s.enemies.some((e) => e.id === chaser.id),
    {
      maxSec: 20,
      stepSec: 0.1,
    },
  );
  expect(rammed.player.hp).toBeLessThan(rammed.player.maxHp);
  expect(rammed.score).toBe(0);
});

test("a shooter closes in and fires within attack range", async ({ game }) => {
  const firing = await game.advanceUntil(
    (s) => s.projectiles.some((p) => p.owner === "enemy"),
    { maxSec: 20, stepSec: 0.1 },
  );
  const shooters = firing.enemies.filter((e) => e.kind !== "chaser");
  expect(shooters.length).toBeGreaterThan(0);
  // Atacante: dentro do alcance de ataque (560 px, com margem de um passo).
  const nearest = Math.min(...shooters.map((e) => distance(e, firing.player)));
  expect(nearest).toBeLessThanOrEqual(580);
  expect(firing.player.hp).toBeLessThanOrEqual(firing.player.maxHp);
});

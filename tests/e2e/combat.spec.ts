// §8.4 Disparos frontal e lateral, dano, cooldown e pontuação sem duplicação.
import { expect, test } from "../fixtures/test";
import { SEEDS, STEP_SEC } from "../helpers/game";

test.beforeEach(async ({ game }) => {
  await game.open({ seed: SEEDS.shooterFirst });
  await game.play();
});

const playerShots = (state: { projectiles: { owner: string }[] }) =>
  state.projectiles.filter((p) => p.owner === "player").length;

test("front cannon fires one projectile and respects its cooldown", async ({
  game,
}) => {
  await game.tap("Space");
  const fired = await game.state();
  expect(playerShots(fired)).toBe(1);
  expect(fired.cooldowns.front).toBeGreaterThan(0.4);

  // Ainda recarregando: apertar de novo não dispara.
  await game.tap("Space");
  expect(playerShots(await game.state())).toBe(1);

  await game.advance(0.45);
  await game.tap("Space");
  expect(playerShots(await game.state())).toBe(2);
});

test("broadsides fire three parallel projectiles per side", async ({
  game,
}) => {
  await game.tap("q");
  expect(playerShots(await game.state())).toBe(3);
  await game.tap("e");
  const both = await game.state();
  expect(playerShots(both)).toBe(6);
  expect(both.cooldowns.left).toBeGreaterThan(1);
  expect(both.cooldowns.right).toBeGreaterThan(1);
  // Cada lado tem o seu cooldown.
  await game.tap("q");
  expect(playerShots(await game.state())).toBe(6);
});

test("holding fire repeats at the cooldown pace", async ({ game, page }) => {
  await page.keyboard.down("Space");
  // 0 s, 0,45 s e 0,9 s: três tiros em 1 s.
  await game.advance(1 - STEP_SEC);
  await page.keyboard.up("Space");
  const state = await game.state();
  expect(playerShots(state)).toBeGreaterThanOrEqual(2);
  expect(playerShots(state)).toBeLessThanOrEqual(3);
  expect(state.cooldowns.front).toBeGreaterThan(0);
});

test("shots damage an enemy and a kill scores exactly one point", async ({
  game,
}) => {
  const spawned = await game.advanceUntil((s) => s.enemies.length > 0, {
    maxSec: 12,
  });
  const target = spawned.enemies[0];
  expect(target.kind).toBe("shooter");

  const hit = await game.fight((s) => {
    const enemy = s.enemies.find((e) => e.id === target.id);
    return !enemy || enemy.hp < enemy.maxHp;
  });
  const damaged = hit.enemies.find((e) => e.id === target.id)!;
  // Dano de um tiro (5,75) ou de mais de um projétil no mesmo passo.
  expect(damaged.maxHp - damaged.hp).toBeGreaterThanOrEqual(5.75);

  const killed = await game.fight(
    (s) => !s.enemies.some((e) => e.id === target.id),
  );
  expect(killed.score).toBe(1);
  await game.advance(2);
  expect((await game.state()).score).toBe(1);
});

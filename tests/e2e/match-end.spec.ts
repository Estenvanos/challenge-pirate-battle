// §8.6 Encerramento por tempo e por morte, interrupção da simulação e reinício limpo.
import { expect, test } from "../fixtures/test";
import { SEEDS } from "../helpers/game";

test("time up ends the match and freezes the simulation", async ({
  game,
  page,
}) => {
  await game.open({ seed: SEEDS.survivor });
  await game.play();
  await game.finishByTime();
  await expect(
    page.getByRole("heading", { name: "Battle Complete" }),
  ).toBeVisible();

  const ended = await game.state();
  expect(ended.endReason).toBe("timeUp");
  await game.hold("w", 2);
  // Q (bordada), não Espaço: Espaço ativaria o botão focado do resultado.
  await game.tap("q");
  const later = await game.state();
  expect(later.elapsedSec).toBe(ended.elapsedSec);
  expect(later.player).toEqual(ended.player);
  expect(later.enemies).toEqual(ended.enemies);
  expect(later.score).toBe(ended.score);
});

test("death ends the match and Play Again restores everything", async ({
  game,
  page,
}) => {
  await game.open({ seed: SEEDS.shooterFirst });
  await game.play();
  await game.finishByDeath();
  await expect(page.getByRole("heading", { name: "Game Over" })).toBeVisible();
  const dead = await game.state();
  expect(dead.endReason).toBe("playerDestroyed");
  expect(dead.player.hp).toBe(0);
  await game.advance(3);
  expect((await game.state()).enemies.length).toBe(dead.enemies.length);

  await game.button("Play Again").click();
  await game.waitForNewMatch();
  const fresh = await game.state();
  expect(fresh.player.hp).toBe(fresh.player.maxHp);
  expect(fresh.score).toBe(0);
  expect(fresh.enemies).toHaveLength(0);
  expect(fresh.projectiles).toHaveLength(0);
  expect(fresh.endReason).toBeNull();
  await expect(
    page.getByRole("definition").filter({ hasText: "01:00" }),
  ).toBeVisible();
});

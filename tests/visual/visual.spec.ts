// §8 Regressão visual: menu, arena em estado estável e resultado (baselines versionadas).
import { expect, test } from "../fixtures/test";
import { SEEDS } from "../helpers/game";

test("main menu", async ({ game, page }) => {
  await game.open();
  await expect(page).toHaveScreenshot("menu.png");
});

test("arena in a stable state", async ({ game, page }) => {
  await game.open({ seed: SEEDS.shooterFirst });
  await game.play();
  // Relógio manual: 12 s de jogo com o primeiro inimigo em cena, e a cena parada.
  await game.advance(12);
  await expect(page).toHaveScreenshot("arena.png");
});

test("result screen", async ({ game, page }) => {
  await game.open({ seed: SEEDS.survivor });
  await game.play();
  await game.finishByTime();
  await expect(page).toHaveScreenshot("result.png");
});

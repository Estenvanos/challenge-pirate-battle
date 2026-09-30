// §8.7 Pausa, perda de foco e retomada sem avanço indevido do cronômetro.
import { expect, test } from "../fixtures/test";

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.play();
  await game.advance(5);
});

const hudTime = (page: import("@playwright/test").Page, text: string) =>
  page.getByRole("definition").filter({ hasText: text });

test("manual pause freezes the clock, cooldowns and simulation", async ({
  game,
  page,
}) => {
  await game.tap("Space");
  const before = await game.state();
  await game.button("Pause").click();
  const menu = page.getByRole("dialog", { name: "Paused" });
  await expect(menu).toBeVisible();

  await game.advance(5);
  const paused = await game.state();
  expect(paused.elapsedSec).toBe(before.elapsedSec);
  expect(paused.cooldowns).toEqual(before.cooldowns);
  expect(paused.projectiles).toEqual(before.projectiles);
  await expect(hudTime(page, "00:55")).toBeVisible();

  await menu.getByRole("button", { name: "Resume" }).click();
  await expect(menu).toBeHidden();
  await game.advance(1);
  expect((await game.state()).elapsedSec).toBeGreaterThan(before.elapsedSec);
});

test("Esc toggles the pause and input from the pause is dropped", async ({
  game,
  page,
}) => {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();
  // Tecla segurada durante a pausa não vira movimento depois.
  await page.keyboard.down("w");
  await game.advance(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeHidden();
  await game.advance(1);
  await page.keyboard.up("w");
  expect((await game.state()).player.speed).toBe(0);
});

test("losing focus pauses and resuming needs a player action", async ({
  game,
  page,
}) => {
  const before = await game.state();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await game.advance(3);
  expect((await game.state()).elapsedSec).toBe(before.elapsedSec);
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();
});

test("hiding the tab pauses the match", async ({ game, page }) => {
  const before = await game.state();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();
  await game.advance(3);
  expect((await game.state()).elapsedSec).toBe(before.elapsedSec);
});

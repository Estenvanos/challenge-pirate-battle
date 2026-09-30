// §8.9 Abandono da partida, navegação repetida entre telas e controles de toque.
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../fixtures/test";
import { distance } from "../helpers/game";

test("an abandoned match is never recorded", async ({ game, page }) => {
  await game.open();
  await game.play();
  await game.advance(5);
  await game.button("Pause").click();
  await game.button("Main Menu").click();
  await expect(page.locator("canvas")).toHaveCount(0);

  await game.play();
  await game.advance(3);
  await page.reload();
  await expect(game.menuTitle).toBeVisible();
  await expect(page.getByText(/Last battle/)).toHaveCount(0);
  await expect(page.getByText(/not saved yet/)).toHaveCount(0);
  await game.openLog("Match History");
  await expect(page.getByText("No battles yet. Set sail!")).toBeVisible();
});

test("repeated navigation between screens stays clean", async ({
  game,
  page,
}) => {
  await game.open();
  for (let round = 0; round < 3; round++) {
    await game.button("Options").click();
    await game.button("Main Menu").click();
    await game.openLog("Ranking");
    await game.button("Main Menu").click();
    await game.play();
    await game.advance(1);
    await page.keyboard.press("Escape");
    await game.button("Main Menu").click();
    await expect(game.menuTitle).toBeVisible();
    // A partida anterior liberou o canvas.
    await expect(page.locator("canvas")).toHaveCount(0);
  }
});

/** Segura um toque (CDP) no centro de cada botão enquanto `during` roda. */
async function holdTouches(
  page: Page,
  buttons: Locator[],
  during: () => Promise<void>,
) {
  const cdp = await page.context().newCDPSession(page);
  const touchPoints = [];
  for (const [id, button] of buttons.entries()) {
    const box = (await button.boundingBox())!;
    touchPoints.push({
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      id,
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints,
  });
  await during();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
}

test("touch controls move, turn and fire at the same time", async ({
  game,
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Touch controls are exercised on the mobile project");
  await game.open();
  await game.play();
  const start = await game.state();
  await holdTouches(
    page,
    [
      page.getByRole("button", { name: "Move forward" }),
      page.getByRole("button", { name: "Turn right" }),
      page.getByRole("button", { name: "Fire front cannon" }),
    ],
    () => game.advance(1),
  );
  const after = await game.state();
  expect(distance(after.player, start.player)).toBeGreaterThan(50);
  expect(after.player.rotation).toBeGreaterThan(start.player.rotation);
  expect(after.projectiles.some((p) => p.owner === "player")).toBe(true);

  // Soltou: nada fica preso.
  await game.advance(2);
  expect((await game.state()).player.speed).toBe(0);
});

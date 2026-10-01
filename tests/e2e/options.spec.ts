// §8.1 Navegação, validação e persistência das opções.
import { expect, test } from "../fixtures/test";

function field(page: import("@playwright/test").Page, name: string) {
  const group = page.getByRole("group", { name });
  return {
    value: group.locator("output"),
    increase: group.getByRole("button", { name: /Increase/ }),
    decrease: group.getByRole("button", { name: /Decrease/ }),
  };
}

test("the main menu opens the controls list", async ({ game }) => {
  const { page } = game;
  await game.open();
  await game.button("Controls").click();
  const dialog = page.getByRole("dialog", { name: "Controls" });
  await expect(dialog).toContainText("Fire front cannon");
  await expect(dialog.getByRole("button", { name: "Back" })).toBeFocused();
  // Esc fecha e o foco volta para o botão do menu.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(game.button("Controls")).toBeFocused();
});

test("options are validated, saved and survive a refresh", async ({ game }) => {
  const { page } = game;
  await game.open();
  await game.button("Options").click();
  await expect(page.getByRole("heading", { name: "Options" })).toBeVisible();

  const session = field(page, "Game session time");
  const spawn = field(page, "Enemy spawn time");
  // Limites: 60 s é o mínimo da sessão e 10 s o máximo do spawn.
  await expect(session.value).toHaveText("60 s");
  await expect(session.decrease).toBeDisabled();
  await expect(spawn.value).toHaveText("10 s");
  await expect(spawn.increase).toBeDisabled();

  await session.increase.click();
  await spawn.decrease.click();
  await expect(session.value).toHaveText("70 s");
  await expect(spawn.value).toHaveText("9 s");

  await page.reload();
  await game.button("Options").click();
  await expect(session.value).toHaveText("70 s");
  await expect(spawn.value).toHaveText("9 s");

  await game.button("Main Menu").click();
  await expect(game.menuTitle).toBeVisible();
});

test("invalid saved options fall back to the defaults", async ({ game }) => {
  await game.open({ options: { sessionTimeSec: 999, spawnIntervalSec: 0 } });
  await game.button("Options").click();
  await expect(field(game.page, "Game session time").value).toHaveText("120 s");
  await expect(field(game.page, "Enemy spawn time").value).toHaveText("3 s");
});

test("options changed mid-match only apply to the next match", async ({
  game,
}) => {
  const { page } = game;
  await game.open();
  await game.play();
  await page.keyboard.press("Escape");
  await page
    .getByRole("dialog", { name: "Paused" })
    .getByRole("button", { name: "Options" })
    .click();
  await field(page, "Game session time").increase.click();
  await game.button("Back").click();
  await game.button("Resume").click();

  // A partida em curso segue com 60 s; a próxima usa 70 s.
  await game.advance(30.1);
  await expect(
    page.getByRole("definition").filter({ hasText: "00:30" }),
  ).toBeVisible();

  await game.button("Pause").click();
  await game.button("Main Menu").click();
  await game.play();
  await expect(
    page.getByRole("heading", { name: /70 s session/ }),
  ).toBeAttached();
  await expect(
    page.getByRole("definition").filter({ hasText: "01:10" }),
  ).toBeVisible();
});

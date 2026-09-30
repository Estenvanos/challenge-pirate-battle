// §8.11 Registro da partida, atualização das duas abas e recuperação de envio pendente após refresh.
import { expect, test } from "../fixtures/test";
import { matchRecord, SEEDS } from "../helpers/game";

test.use({ setup: { seed: SEEDS.shooterFirst } });

const rows = (page: import("@playwright/test").Page) =>
  page.locator("tbody tr");

test("a finished match is recorded once and shows in both tabs", async ({
  game,
  page,
}) => {
  await game.open();
  await game.play();
  await game.finishByDeath();
  await expect(game.resultDialog.getByRole("status")).toHaveText(
    "Result saved to the ranking.",
  );
  await game.button("Main Menu").click();

  await game.openLog("Ranking");
  // Só partidas com a mesma configuração (60 s / 10 s): a nossa.
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Tester");
  await expect(rows(page).first()).toContainText("You");

  await page.getByRole("tab", { name: "Match History" }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Defeated");
});

test("a failed submission stays pending, allows a new match and is sent after a refresh", async ({
  game,
  page,
}) => {
  await game.open({ scenario: "downAtMatchEnd" });
  await game.play();
  await game.finishByDeath();
  await expect(game.resultDialog.getByRole("alert")).toContainText(
    "Could not save your result.",
  );
  await game.button("Main Menu").click();
  await expect(
    page.getByText("1 match result is not saved yet."),
  ).toBeVisible();

  // O pendente não bloqueia outra partida.
  await game.play();
  await game.button("Pause").click();
  await game.button("Main Menu").click();

  // A API volta: o refresh reenvia a fila.
  await page.goto("/?scenario=success&seed=1");
  await expect(game.menuTitle).toBeVisible();
  await expect(page.getByText(/not saved yet/)).toHaveCount(0);
  await game.openLog("Match History");
  await expect(rows(page)).toHaveCount(1);
});

test("a pending record from a previous session is sent on load", async ({
  game,
  page,
}) => {
  await game.open({ pending: [matchRecord("pending-from-before", 4)] });
  await expect(page.getByText(/not saved yet/)).toHaveCount(0);
  await game.openLog("Match History");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("4");
});

// §8.10 Consulta e paginação das abas Ranking e Match History: carregamento, vazio e erro.
import { expect, test } from "../fixtures/test";

// A configuração padrão (120 s / 3 s) é uma das três das fixtures.
test.use({ setup: { options: { sessionTimeSec: 120, spawnIntervalSec: 3 } } });

const rows = (page: import("@playwright/test").Page) =>
  page.locator("tbody tr");

test("ranking lists other captains and paginates", async ({ game, page }) => {
  await game.open();
  await game.openLog("Ranking");
  await expect(rows(page)).toHaveCount(5);
  await expect(rows(page).first().getByRole("cell").first()).toHaveText("01");
  await expect(page.getByText("Page 1 of 3")).toBeVisible();

  await game.button("Next page").click();
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
  await expect(rows(page).first().getByRole("cell").first()).toHaveText("06");
  await expect(game.button("Previous page")).toBeEnabled();
});

test("tabs switch with the keyboard and history starts empty", async ({
  game,
  page,
}) => {
  await game.open();
  await game.openLog("Ranking");
  await page.getByRole("tab", { name: "Ranking" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Match History" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("No battles yet. Set sail!")).toBeVisible();
});

test("many pages of history paginate to the end", async ({ game, page }) => {
  await game.open({ scenario: "manyPages" });
  await game.openLog("Match History");
  await expect(page.getByText("Page 1 of 6")).toBeVisible();
  for (let i = 2; i <= 6; i++) await game.button("Next page").click();
  await expect(page.getByText("Page 6 of 6")).toBeVisible();
  await expect(game.button("Next page")).toBeDisabled();
});

test("a slow API shows the loading state", async ({ game, page }) => {
  await game.open({ scenario: "slow" });
  await game.openLog("Ranking");
  await expect(
    page.getByRole("status").filter({ hasText: "Loading…" }),
  ).toBeVisible();
  await expect(rows(page)).toHaveCount(5, { timeout: 10_000 });
});

test("empty lists show the empty state", async ({ game, page }) => {
  await game.open({ scenario: "empty" });
  await game.openLog("Ranking");
  await expect(
    page.getByText("No battles recorded with these options yet."),
  ).toBeVisible();
});

test("a failing ranking shows an error with Try again, history still works", async ({
  game,
  page,
}) => {
  await game.open({ scenario: "rankingDown" });
  await game.openLog("Ranking");
  const alert = page.getByRole("alert");
  // 503 é retentado com backoff antes do erro.
  await expect(alert).toContainText("Could not load the ranking.", {
    timeout: 15_000,
  });
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();

  await page.getByRole("tab", { name: "Match History" }).click();
  await expect(page.getByText("No battles yet. Set sail!")).toBeVisible();
});

test("a failing history shows an error", async ({ game, page }) => {
  await game.open({ scenario: "historyDown" });
  await game.openLog("Match History");
  await expect(page.getByRole("alert")).toContainText(
    "Could not load your match history.",
    {
      timeout: 15_000,
    },
  );
});

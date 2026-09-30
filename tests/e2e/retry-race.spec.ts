// §8.12 Reenvio após timeout sem duplicação e respostas atrasadas sem sobrescrever dados recentes.
import { expect, test } from "../fixtures/test";
import { SEEDS } from "../helpers/game";

const rows = (page: import("@playwright/test").Page) =>
  page.locator("tbody tr");

test("a resend after a write timeout does not duplicate the match", async ({
  game,
  page,
}) => {
  await game.open({ scenario: "timeoutAfterWrite", seed: SEEDS.shooterFirst });
  await game.play();
  await game.finishByDeath();
  const status = game.resultDialog.getByRole("alert");
  // O servidor gravou, mas a resposta nunca chega: o Axios desiste em 8 s.
  await expect(status).toContainText("Could not save your result.", {
    timeout: 15_000,
  });
  await status.getByRole("button", { name: "Try again" }).click();
  await expect(game.resultDialog.getByRole("status")).toHaveText(
    "Result saved to the ranking.",
  );
  // Cliques repetidos também não duplicam.
  await game.button("Main Menu").click();
  await game.openLog("Match History");
  await expect(rows(page)).toHaveCount(1);
  await page.getByRole("tab", { name: "Ranking" }).click();
  await expect(rows(page)).toHaveCount(1);
});

test("a late response never overwrites the page on screen", async ({
  game,
  page,
}) => {
  // Anota quando cada pedido do Axios termina (resposta ou aborto): o MSW
  // atende pelo service worker, que o Playwright não enxerga.
  await page.addInitScript(() => {
    const settled: string[] = [];
    Object.assign(window, { __settled: settled });
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      ...args: Parameters<XMLHttpRequest["open"]>
    ) {
      const url = String(args[1]);
      this.addEventListener("loadend", () => settled.push(url));
      return open.apply(this, args);
    } as XMLHttpRequest["open"];
  });
  // Pedidos alternam lento (2,5 s) e rápido: a página 3 chega depois da 2.
  await game.open({
    scenario: "outOfOrder",
    options: { sessionTimeSec: 120, spawnIntervalSec: 3 },
  });
  await game.openLog("Ranking");
  await expect(page.getByText("Page 1 of 3")).toBeVisible({ timeout: 10_000 });
  await game.button("Next page").click();
  await expect(rows(page).first().getByRole("cell").first()).toHaveText("06");

  await game.button("Next page").click();
  await game.button("Previous page").click();
  await page.waitForFunction(() =>
    (window as unknown as { __settled: string[] }).__settled.some((url) =>
      url.includes("page=3"),
    ),
  );
  await expect(page.getByText(/^Page 2 of 3/)).toBeVisible();
  await expect(rows(page).first().getByRole("cell").first()).toHaveText("06");
});

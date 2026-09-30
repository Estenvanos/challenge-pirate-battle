// §8.2 Carregamento dos assets, falhas e nova tentativa.
import { expect, test } from "../fixtures/test";

// O route do Playwright não vê pedidos atendidos pelo service worker do MSW.
// Sem ele o app abre igual (a API só falharia), e os assets passam pelo route.
test.use({ serviceWorkers: "block" });

test("shows loading progress until the arena is ready", async ({
  game,
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  // Segura um tile: o carregamento fica visível até liberarmos.
  await page.context().route(/tile_5\.png$/, async (route) => {
    await gate;
    await route.continue();
  });
  await game.open();
  await game.button("Play").click();
  await expect(
    page.getByRole("progressbar", { name: "Loading arena" }),
  ).toBeVisible();
  release();
  await game.waitForArena();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("a failed asset shows an error and Retry loads the arena", async ({
  game,
  page,
}) => {
  // A rota fica registrada o teste todo: desregistrar com pedidos em voo pode
  // deixá-los pendurados no Playwright.
  let failing = true;
  await page
    .context()
    .route(/tile_7\.png$/, (route) =>
      failing ? route.abort() : route.continue(),
    );
  await game.open();
  await game.button("Play").click();
  await expect(page.getByRole("alert")).toContainText(
    "The arena could not be loaded.",
    { timeout: 20_000 },
  );
  // O HUD não dá acesso ao combate enquanto a arena não existe.
  expect(
    await page.evaluate(() => window.__GAME_TEST__?.ready() ?? false),
  ).toBe(false);

  failing = false;
  await game.button("Retry").click();
  await game.waitForArena();
  expect((await game.state()).player.hp).toBe(100);
});

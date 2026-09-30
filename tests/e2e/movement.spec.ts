// §8.3 Início de partida, movimento, rotação, limites da arena e colisão com ilhas.
import { expect, test } from "../fixtures/test";

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.play();
});

test("starts a match with a full HUD and the ship at rest", async ({
  game,
}) => {
  const state = await game.state();
  expect(state.player.hp).toBe(state.player.maxHp);
  expect(state.player.speed).toBe(0);
  expect(state.score).toBe(0);
  expect(state.enemies).toHaveLength(0);
  const hud = game.page.getByRole("definition");
  await expect(hud.filter({ hasText: "01:00" })).toBeVisible();
});

test("forward moves along the bow and rotation turns both ways", async ({
  game,
}) => {
  const start = await game.state();
  await game.hold("w", 1);
  const moved = await game.state();
  // Proa para cima (-π/2): anda em -y, sem desviar em x.
  expect(moved.player.y).toBeLessThan(start.player.y - 50);
  expect(Math.abs(moved.player.x - start.player.x)).toBeLessThan(1);

  await game.hold("d", 0.4);
  const right = await game.state();
  expect(right.player.rotation).toBeGreaterThan(moved.player.rotation);

  await game.hold("ArrowLeft", 0.8);
  const left = await game.state();
  expect(left.player.rotation).toBeLessThan(right.player.rotation);
});

test("the ship stays inside the arena", async ({ game }) => {
  // Da largada, a proa aponta para a borda de cima com água livre.
  await game.hold("ArrowUp", 8);
  const { player } = await game.state();
  expect(player.y).toBeGreaterThanOrEqual(0);
  expect(player.y).toBeLessThan(80);
  await game.hold("w", 1);
  expect((await game.state()).player.y).toBeCloseTo(player.y, 0);
});

test("islands block the ship", async ({ game }) => {
  // A oeste da largada há uma ilha de areia (colunas 3–4 da linha 4).
  await game.turnTo(Math.PI);
  await game.hold("w", 4);
  const blocked = await game.state();
  expect(blocked.playerOnIsland).toBe(false);
  // Parou antes da borda da arena: foi a ilha que segurou.
  expect(blocked.player.x).toBeGreaterThan(5 * 128);
  await game.hold("w", 1);
  const still = await game.state();
  expect(still.player.x).toBeCloseTo(blocked.player.x, 0);
  expect(still.playerOnIsland).toBe(false);
});

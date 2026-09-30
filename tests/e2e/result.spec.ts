// §8.8 Exibição do resultado e sua persistência após refresh.
import { expect, test } from "../fixtures/test";
import { SEEDS } from "../helpers/game";

test("the result shows score, time, reason and save status, and survives a refresh", async ({
  game,
  page,
}) => {
  await game.open({ seed: SEEDS.survivor });
  await game.play();
  await game.finishByTime();
  const { score } = await game.state();

  const dialog = game.resultDialog;
  await expect(dialog).toContainText(`Score: ${score}`);
  await expect(dialog).toContainText("01:00");
  await expect(dialog).toContainText("Time up");
  await expect(dialog.getByRole("status")).toHaveText(
    "Result saved to the ranking.",
  );
  await expect(
    dialog.getByRole("button", { name: "Play Again" }),
  ).toBeFocused();
  // Esc não fecha o resultado.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  await page.reload();
  const last = page.getByText(/Last battle:/);
  await expect(last).toContainText(`${score} points`);
  await expect(last).toContainText("01:00");
  await expect(last).toContainText("Time up");
});

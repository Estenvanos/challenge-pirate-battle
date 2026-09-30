import { test as base, expect } from "@playwright/test";
import { GamePage, type AppSetup } from "../helpers/game";

// Todo teste começa isolado (contexto novo) e falha se a página lançar um erro
// ou escrever console.error. Falhas de rede simuladas pelo MSW são esperadas.
const EXPECTED_CONSOLE = [/Failed to load resource/];

export const test = base.extend<{ game: GamePage; setup: AppSetup }>({
  setup: [{}, { option: true }],
  game: async ({ page, setup }, use) => {
    const problems: string[] = [];
    page.on("pageerror", (error) =>
      problems.push(`pageerror: ${error.message}`),
    );
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (!EXPECTED_CONSOLE.some((pattern) => pattern.test(text))) {
        problems.push(`console.error: ${text}`);
      }
    });
    const game = new GamePage(page, setup);
    await use(game);
    expect(problems, "console must stay clean").toEqual([]);
  },
});

export { expect };

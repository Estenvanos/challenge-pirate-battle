import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const CI = Boolean(process.env.CI);

// Chromium desktop e mobile (toque). O servidor dos testes liga os ganchos
// window.__GAME_TEST__ (VITE_GAME_TEST) e o relógio manual da partida.
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // Cada página roda a arena em WebGL por software: poucos workers, folga no timeout.
  workers: 2,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.01 },
  },
  snapshotPathTemplate: "tests/visual/__snapshots__/{projectName}/{arg}{ext}",
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    { name: "mobile", use: { ...devices["Pixel 7 landscape"] } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --open false`,
    url: `http://localhost:${PORT}`,
    env: { VITE_GAME_TEST: "true" },
    reuseExistingServer: !CI,
    timeout: 60_000,
  },
});

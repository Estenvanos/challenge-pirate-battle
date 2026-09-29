---
paths:
  - "tests/**"
  - "src/testing/**"
  - "playwright.config.ts"
---

# Testing rules (Playwright)

## Setup
- Projects: Chromium desktop and Chromium mobile (device emulation with touch). HTML reporter; traces `on-first-retry` / retained on failure.
- Tests run against the built app (`vite preview`) or dev server configured in `webServer`.

## Isolation and determinism
- Every test starts from isolated state: fresh context/storage, explicit MSW scenario, explicit seed. Use shared fixtures in `tests/fixtures`.
- `window.__GAME_TEST__` (from `src/testing/testHooks.ts`) exposes seed, clock control (pause/step/advance) and state reads. It is only installed in test mode (flag), never in normal production use.
- Instrumentation may observe state and control the clock, but must not bypass rules: combat tests press the real game controls (keyboard/touch) and assert effects.

## Style
- No `page.waitForTimeout`. Wait on locators, `expect.poll`, or advance the game clock deterministically.
- Prefer role/label locators (`getByRole`, `getByLabel`) — they also validate accessibility.
- Helpers for clock, scenarios and inputs live in `tests/helpers`.
- Assert the console has no unhandled errors in main flows.

## Coverage map
Specs in `tests/e2e/` map 1:1 to `proposta.md` §8 items (options, assets-loading, movement, combat, enemies, match-end, pause, result, navigation-touch, ranking-history, submission, retry-race).

## Visual regression
- `tests/visual/visual.spec.ts`: menu, arena in a stable seeded/paused state, result screen. Baselines versioned in `__snapshots__`. Disable animations and fix viewport before snapshotting.

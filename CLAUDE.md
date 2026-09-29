# Pirate Battle

2D top-down naval shooter (single-player, browser-only). The player sails between islands, fights enemy ships (Chaser, Shooter) and scores points until the match ends. Ranking and match history use REST APIs mocked with MSW.

- **Requirements source of truth:** `proposta.md` (challenge brief). Re-read the relevant section before implementing a feature.
- **Design decisions:** @ARCHITECTURE.md — keep it updated when a decision changes.
- **Area-specific rules:** `.claude/rules/*.md` (loaded automatically by path).

## Stack

React · TypeScript (strict) · PixiJS 8 · TanStack Query · Axios · MSW · Playwright · Vite. Every one of them must participate in the solution.

## Commands

| Command | Status |
| --- | --- |
| `npm run dev` | Vite dev server on port 8080 |
| `npm run lint` | ESLint + Prettier |
| `npm run build` | lint + `tsc` + `vite build` |
| `npm run typecheck` | to be added (`tsc --noEmit`) |
| `npm run preview` | to be added |
| `npm run format` | to be added |
| `npm run test:e2e` | to be added (Playwright, Chromium desktop + mobile) |
| `npm run test:visual` | to be added (visual regression, versioned baselines) |

## Folder map

```
public/assets/        provided assets (ships, tiles, effects, spritesheets, sounds) + mockServiceWorker.js
src/main.tsx          bootstrap: start MSW, then render App
src/app/              App, routes (menu, options, match, result), providers, styles
src/config/           typed gameConfig (balancing) and options limits
src/game/             game core — NO React
  core/               Game (init/destroy), GameLoop (fixed timestep), GameClock, EventBus, seeded random
  simulation/         World (continuous match state), entities (pure data), systems
  physics/            vector math, circle/circle and circle/polygon collision
  arena/              tile map, islands, spawn points
  input/              InputManager, keyboard, touch, abstract actions
  render/             PixiRenderer, viewport (resize/DPR), views, effects
  assets/             PIXI.Assets manifest/bundles, loading with progress/error/retry
  audio/              SoundManager
  bridge/             gameStore (throttled snapshot) + useGameSnapshot (useSyncExternalStore)
src/features/         React screens: menu, options, match, result, ranking, history
src/api/              Axios client, typed contracts, APIs, query keys, hooks, pending submissions
src/mocks/            MSW worker, handlers, fixtures, scenarios, mockDb, ScenarioPanel
src/storage/          typed localStorage wrapper, options, last result
src/shared/           reusable components, hooks, utils
src/testing/          window.__GAME_TEST__ hooks (seed, clock, state read)
tests/                Playwright e2e, visual, fixtures, helpers
docs/profiling/       FPS, p95 frame time, memory evidence
```

## Always-on rules

1. **Dependency direction:** `features` → `game/bridge` → `game`. `src/game/**` never imports React, `src/api`, `src/features` or `src/mocks`.
2. **State ownership:** continuous combat state lives only in `World`. React never re-renders per frame; it reads throttled snapshots via `gameStore` + `useSyncExternalStore`, and discrete events via `EventBus`.
3. **Config:** every balancing value comes from `src/config/gameConfig.ts`. A match takes a frozen snapshot of the config at start; later changes only affect new matches. No magic numbers in systems.
4. **Determinism:** simulation code never calls `Math.random`, `Date.now` or `performance.now`. Use the seeded RNG (`core/random.ts`) and `GameClock`.
5. **Lifecycle:** whatever registers a listener, ticker, timer, texture or entity must release it in `destroy()`. Init/destroy must be safe under React Strict Mode.
6. **Language:** code identifiers, UI text and docs in English.
7. **Console clean:** no unhandled errors during the expected flows.

## Definition of done

- `npm run lint` and typecheck pass.
- Relevant Playwright specs pass (and new behavior has a spec when it maps to a required test in `proposta.md` §8).
- No console errors in the affected flow.
- `ARCHITECTURE.md` (and `README.md` when commands/controls change) updated.

## Git workflow

- Branch names: `area/short-description` — `infra/…`, `feat/…`, `fix/…`, `test/…`, `docs/…`, `refactor/…`.
- Commit only when asked. Short, imperative commit messages.
- **Never add Claude co-author or attribution lines** (`Co-Authored-By: Claude …`, "Generated with Claude Code") to commits or PRs.

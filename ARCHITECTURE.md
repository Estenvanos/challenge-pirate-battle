# Architecture

> Status: **initial draft**. Sections marked **TBD** will be filled in as the implementation lands. Keep this file in sync with the code.

## 1. Overview and layers

Pirate Battle is a single-player 2D top-down naval shooter that runs entirely in the browser.

| Layer | Folder | Responsibility | Technology |
| --- | --- | --- | --- |
| App shell | `src/app` | Routing, providers, global styles | React |
| Screens | `src/features` | Menu, options, match (HUD, touch controls, pause), result, ranking, history | React |
| Bridge | `src/game/bridge` | Throttled snapshot of game state for the UI | `useSyncExternalStore` |
| Game core | `src/game` | Simulation, physics, arena, input, rendering, assets, audio | TypeScript + PixiJS |
| Config | `src/config` | Typed balancing config and options limits | TypeScript |
| Server-state hooks | `src/hooks` | `useRanking`, `useMatchHistory`, `useSubmitMatch` (only place calling `useQuery`/`useMutation`) | TanStack Query |
| Remote data | `src/api` | Contracts, HTTP client, QueryClient, per-service calls and query options, pending submissions | Axios + TanStack Query |
| Mocks | `src/mocks` | REST mocks for ranking and history | MSW |
| Persistence | `src/storage` | Typed, safe `localStorage` access | — |

### Dependency direction

```
features ──► game/bridge ──► game/core ──► game/simulation ──► game/physics, game/arena
   │                              │
   │                              └──► game/render, game/input, game/assets, game/audio
   ├──► hooks ──► api/services ──► (HTTP) ──► mocks (MSW, network layer)
   └──► storage
config ◄── used by game and features
```

- `src/game/**` has no dependency on React, `api`, `features` or `mocks`.
- `game/simulation` has no dependency on PixiJS or the DOM. It runs headless.

## 2. React ↔ PixiJS integration

- `features/match/GameCanvas.tsx` creates one `Game` on mount and calls `game.destroy()` on unmount.
  - Init is async, so a `cancelled` guard destroys the instance if the component unmounted during init. This keeps it correct under React Strict Mode's double mount.
  - `destroy()` is idempotent.
- `Game` (`game/core/Game.ts`) wires together `GameLoop`, `World`, the systems, `InputManager`, `PixiRenderer` and `SoundManager`.
- The UI is synced from the game in two ways. Neither causes a React render every frame.
  - **Snapshots:** `gameStore` publishes a throttled snapshot (HP, score, remaining time, pause state). React reads it with `useGameSnapshot` (`useSyncExternalStore`).
  - **Events:** `EventBus` emits discrete events (enemy destroyed, player hit, match ended, paused/resumed). The HUD, `LiveRegion` and result flow consume them.
- Each match starts from a frozen snapshot of `gameConfig` merged with the saved options.

## 3. Simulation loop

- **Fixed timestep:** the step size is **TBD**, e.g. 1/60 s.
  - An accumulator consumes real frame time.
  - The frame delta is clamped so a long stall cannot trigger an avalanche of steps.
  - Rendering runs once per frame and may interpolate. **TBD**
- `GameClock` is the only time source. It can be paused, and test hooks can step it by hand.
- `core/random.ts` provides a seeded PRNG (algorithm **TBD**, e.g. mulberry32). It drives spawns and AI variation.
- System order per tick:
  1. input
  2. chaser AI and shooter AI
  3. movement
  4. weapons
  5. projectiles
  6. collisions
  7. damage
  8. spawn
  9. match (timer, score, end)
- **Pause:**
  - Manual pause, plus automatic pause on `blur` or `visibilitychange`.
  - Freezes the clock, cooldowns and the simulation.
  - Resuming requires a player action.
  - Input state is cleared on pause and on resume, so nothing accumulates while paused.
- **Match end:** triggered when time runs out or HP reaches 0. Once ended, movement, attacks, damage, spawns and scoring stop.
- **Restart:** builds a new `World`. The old one is not reset in place.

## 4. Collisions

- Ships and projectiles are circles.
- Islands are convex polygons (or sets of them) built from the tile map.
- Tests used:
  - circle vs circle for ship↔ship and projectile↔ship;
  - circle vs polygon for ship↔island and projectile↔island.
- Resolution: ships are pushed out along the minimum translation vector and slide along the obstacle. Projectiles are removed on contact.
- Arena bounds clamp ship positions. Projectiles that leave the arena are removed.
- Each projectile applies damage once. After the first hit it is flagged and removed in the same step.
- Broad phase: **TBD** (a brute-force pass may be enough for the expected entity count, pending profiling).

## 5. Rendering and resource management

- `game/assets/manifest.ts` defines the `PIXI.Assets` bundles (ships, effects, tiles, UI).
  - `loadGameAssets` reports progress, surfaces errors and supports retry before combat starts.
  - Retina variants are picked based on DPR.
- Textures are loaded once and reused. Projectile and effect views are pooled.
- Views (`ShipView`, `ProjectileView`, `HealthBarView`, `IslandView`) read from `World` every frame and own no gameplay state.
- The ship sprite degrades visually as HP drops.
- Viewport: sets `resolution` and `autoDensity` from the DPR and letterboxes the arena to keep its aspect ratio. Pointer coordinates are converted to arena coordinates.
- `destroy()` releases, in order: ticker, listeners, timers, stage children, the application, and the audio loops.
- Memory is checked across 5 play cycles (see §10).

## 6. Input

- Keyboard and touch input map to abstract actions:
  - `forward`
  - `rotateLeft`, `rotateRight`
  - `fireFront`, `fireLeft`, `fireRight`
  - `pause`
- Moving and firing can happen at the same time.
- Keys are captured only while gameplay is active.
- Key bindings: **TBD**, documented in the README and shown in the UI from the same definitions.

## 7. Local persistence

| Key | Content | Module |
| --- | --- | --- |
| options | session time, spawn interval | `storage/optionsStorage.ts` |
| last result | last completed match result | `storage/lastResultStorage.ts` |
| pending submissions | queue of unconfirmed match records | `api/pendingSubmissions.ts` |
| mock DB | confirmed records (MSW) | `mocks/mockDb.ts` |
| scenario | selected MSW scenario | `mocks/scenarios` |

All access goes through `storage/localStore.ts`, which handles namespacing, versioning, `try/catch`, validation and fallback to defaults.

A match that is abandoned, whether by refreshing or by leaving the match screen, is never recorded.

## 8. Ranking and match history

- **Contracts** (`api/contracts.ts`), shared by the client and the MSW handlers:
  - `MatchRecord`: matchId, playerId, playerName, date (ISO), score, durationSec (effective), endReason (`timeUp` | `playerDestroyed`), config (`MatchConfig`).
  - `RankingEntry`: a match plus its global 1-based `position`.
  - `Page<T>`: items, page, pageSize, totalItems, totalPages. Default page size is 10 and the maximum is 50.
  - `ApiError` (`code`, `message`) and `SubmitMatchResponse` (`record`, `created`).
  - `isMatchRecord` runtime validator, used by the PUT handler and by persisted data.
- **Endpoints** (relative paths, so they work on any origin):
  - `GET /api/ranking?sessionTime&spawnInterval&page&pageSize`: `sessionTime` and `spawnInterval` are required. Returns `Page<RankingEntry>`.
  - `GET /api/matches?playerId&page&pageSize`: `playerId` is required. Returns `Page<MatchRecord>`, newest first.
  - `PUT /api/matches/:matchId`: an idempotent upsert. Returns `201 {created: true}` for a new record, or `200 {created: false}` with the existing record, which is left untouched.
  - Invalid or missing parameters, an invalid body, or a URL/body `matchId` mismatch return `400` with an `ApiError`.
- **Ranking rules:**
  - Only matches played with the same configuration are compared.
  - One entry per match.
  - Tie-break: score desc → durationSec asc → date asc → matchId asc.
- **Layout:**
  - `api/httpClient.ts`: the single Axios instance (`baseURL: /api`, timeout).
  - `api/queryClient.ts`: `createQueryClient()` with the defaults below.
  - `api/services/<service>/service.ts`: plain Axios calls typed with the contracts; no TanStack imports.
  - `api/services/<service>/queries.ts`: query key factories (`rankingKeys`, `matchesKeys`) and `queryOptions`/`mutationOptions` factories; no React hooks.
  - Services: `ranking` (GET ranking) and `matches` (GET history, PUT submit).
  - `src/hooks/`: React hooks built on those options; components use these, never `api/services` directly.
  - `app/providers/AppProviders.tsx` owns the `QueryClient` and mounts TanStack Query Devtools in dev only (excluded from the production bundle).
- **Caching:**
  - Query keys come from each service's `queries.ts`.
  - `staleTime` 30 s; retries up to 3 times with exponential backoff (500 ms → 8 s cap), never on 4xx.
  - Pagination keeps the previous page on screen while the next one loads.
  - Data refetches when a tab becomes visible again.
  - Retries use backoff.
  - Abort signals ensure a late response never overwrites newer data.
- **Submission:**
  - `matchId` is generated on the client when the match ends, and the record is saved to the pending queue.
  - `useSubmitMatch` (`src/hooks`) sends it. On success it removes the record from the queue and invalidates the ranking and history queries.
  - Resends and repeated clicks return the existing record, so no duplicates are created.
  - Pending records survive a refresh and can be retried.
  - A pending submission never blocks starting a new match.

## 9. MSW mocks

- The same contracts, fixtures and handlers are used in dev, tests and the published build. The worker also runs in production.
- Layout of `src/mocks`:
  - `browser.ts`: `setupWorker` and `startMocks()`, called in `main` before anything else touches the network.
  - `handlers/`: `ranking.ts`, `history.ts`, shared `errors.ts`, and `index.ts`, which aggregates them.
  - `fixtures/`: other players, plus about 40 deterministic matches across 3 configs (fixed dates, no randomness).
  - `mockDb.ts`: fixtures plus confirmed records. Only confirmed records are persisted, via `storage/localStore.ts` (key `pirate-battle:mockDb`). `resetMockDb()` clears them.
  - `pagination.ts`: page parameter parsing and validation, and slicing.
- The local player (`local-player`) has no fixture matches, so their history starts empty.
- Scenarios (**not implemented yet**; only the success path exists today):
  - success, empty, multiple pages;
  - slow, variable latency, out-of-order responses;
  - timeout, network error, 4xx/5xx;
  - ranking or history read failure;
  - timeout after a write;
  - API unavailable at match end, then recovery.
- A scenario is selected through `ScenarioPanel`, or through a URL or storage flag for tests. The panel can also reset everything to the initial state.
- Latency and randomness are seeded so tests are reproducible.

## 10. Testing and profiling

- Playwright E2E runs on Chromium, desktop and mobile. Specs map to the required test list.
- Visual regression covers the menu, the arena in a stable state and the result screen. Baselines are versioned.
- Determinism comes from `window.__GAME_TEST__`: seed, clock control and state reads. It is enabled in test mode only.
- Profiling results go in `docs/profiling/`: FPS, p95 frame time, entity count over a 3-minute match, and memory after 5 cycles. The reference environment is **TBD**.

## 11. Balancing decisions

**TBD**. Values will live in `src/config/gameConfig.ts`; this section will explain the reasoning behind them.

## 12. Known limitations

**TBD**.

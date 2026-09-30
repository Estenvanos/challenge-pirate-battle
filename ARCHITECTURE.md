# Architecture

> Keep this file in sync with the code. Setup, controls, commands and network scenarios are in [README.md](README.md).

## Where each requirement is answered

| Brief (`proposta.md`)                        | Section                           |
| -------------------------------------------- | --------------------------------- |
| §4 Rules vs rendering vs input vs UI state   | [1](#1-overview-and-layers)       |
| §4 React ↔ PixiJS sync, Strict Mode          | [2](#2-react--pixijs-integration) |
| §2, §4 Time-based simulation, enemies, pause | [3](#3-simulation-loop)           |
| §2 Collisions, arena                         | [4](#4-collisions-and-arena)      |
| §4, §7 Textures, loading, viewport, cleanup  | [5](#5-rendering-and-resources)   |
| §2, §7 Keyboard and touch                    | [6](#6-input)                     |
| §3 Local persistence                         | [7](#7-local-persistence)         |
| §5 Contracts, cache, pending submissions     | [8](#8-ranking-and-match-history) |
| §6 MSW scenarios                             | [9](#9-msw-mocks)                 |
| §8, §9 Tests and profiling                   | [10](#10-testing-and-profiling)   |
| §3 Balancing                                 | [11](#11-balancing-decisions)     |
| Limitations                                  | [12](#12-known-limitations)       |

## 1. Overview and layers

Single-player 2D naval shooter, entirely in the browser. The game core is plain TypeScript + PixiJS; React only draws menus, HUD and dialogs.

| Layer       | Folder            | Responsibility                                                              |
| ----------- | ----------------- | --------------------------------------------------------------------------- |
| App shell   | `src/app`         | Screen state, providers, global styles                                      |
| Screens     | `src/features`    | Menu, options, match (HUD, touch controls, pause), result, ranking, history |
| Bridge      | `src/game/bridge` | Game → React snapshot (`useSyncExternalStore`)                              |
| Game core   | `src/game`        | Simulation, physics, arena, input, rendering, assets, audio                 |
| Config      | `src/config`      | Typed balancing values and option limits                                    |
| Constants   | `src/constants`   | Storage keys, API routes/timings, sound URLs, UI labels                     |
| Schemas     | `src/schemas`     | Zod contracts; types come from `z.infer`                                    |
| Hooks       | `src/hooks`       | The only place that calls `useQuery` / `useMutation`                        |
| Remote data | `src/api`         | Axios client, QueryClient, services, pending queue                          |
| Mocks       | `src/mocks`       | MSW handlers, fixtures, scenarios                                           |
| Persistence | `src/storage`     | Typed, validated `localStorage`                                             |

```
features ──► game/bridge ──► game/core ──► game/simulation ──► game/physics, game/arena
   │                              └──► game/render, game/input, game/assets, game/audio
   ├──► hooks ──► api/services ──► (HTTP) ──► mocks (MSW)
   └──► storage
config, constants ◄── every layer        schemas ◄── api, storage, mocks, features (never game)
```

Hard rules:

- `src/game/**` never imports React, `api`, `features`, `mocks` or Zod.
- `game/simulation` has no PixiJS or DOM: it runs headless.
- Continuous combat state lives only in `World`. Renderers and React read it; they never own it.

## 2. React ↔ PixiJS integration

**Screens.** `app/App.tsx` holds a typed screen state (`menu` | `options` | `log` | `match`). There is no router, so a refresh always lands on the menu and abandons any match.

- **Menu:** Play, Options, Captain's Log shortcuts, last result, pending-save status.
- **Options:** steppers for session time and spawn interval (saved on change), a global **Sound** toggle, and a **Controls** list built from `KEY_BINDINGS`.
- **Captain's Log:** `Ranking` and `Match History` tabs (WAI-ARIA tabs), 5 rows per page.
- **Player name:** asked once in a native `<dialog>` (2–16 chars). `playerId` is always `local-player`.
- **Match:** `GameCanvas` (Pixi) + `Hud` (score, time, health) + `TouchControls` + `PauseMenu`. `ArenaLoading` covers the screen with a progress bar until assets load, and offers **Retry** on failure.
- **Result:** `ResultDialog` (**Battle Complete** / **Game Over**) with score, time played, end reason, save status (with **Try again**), **Play Again** and **Main Menu**.

**Game lifecycle.** `GameCanvas` creates one `Game` on mount and calls `game.destroy()` on unmount.

- Init is async; a `cancelled` guard destroys the instance if the component unmounted mid-init. This makes React Strict Mode's double mount safe.
- `destroy()` is idempotent.
- `Game` (`game/core/Game.ts`) wires `GameLoop`, `World`, systems, `InputManager`, `PixiRenderer` and `SoundManager`.

**Game → UI sync (no per-frame React render).**

- `Game` reports discrete changes through `GameInitOptions` callbacks: `onPlayerHealth` (on hit/repair), `onScore` (on kill), `onTimeLeft` (once per second), `onCooldowns` (only when a value changes), `onMatchEnd` (once).
- `GameCanvas` writes them to `gameStore`; React reads it with `useGameSnapshot` (`useSyncExternalStore`).
- Weapon cooldown veils are CSS variables (`--cooldown-*`) written straight to the DOM, not React state.
- `MatchAnnouncer` is a hidden `role="status"` region. It only speaks on score changes, time marks (1 min, 30 s, 10 s) and low health.

There is no separate event bus: the simulation pushes `WorldEvent`s, `Game` drains them after every step and turns them into sounds, effects and the callbacks above.

**Match end.** `onMatchEnd` fires 1 s after the simulation ends (so the last explosion is seen). `App` gives each match a `matchId` (`crypto.randomUUID()`), used as the React key of `MatchScreen` — so **Play Again** remounts a fresh `Game` and `World` — and as the record id, so a retry never duplicates it.

## 3. Simulation loop

**Fixed timestep** (`core/GameLoop.ts`, driven by the Pixi ticker):

- Step of 1/60 s. An accumulator consumes real frame time; the frame delta is clamped to 0.25 s so a stall cannot trigger a burst of steps.
- Render runs once per frame and interpolates between the previous and current transform (`alpha = accumulator / stepSec`), so motion is smooth above 60 Hz.
- `GameClock` is the only time source; the seeded PRNG (`core/random.ts`, mulberry32) the only randomness. Simulation code never calls `Math.random`, `Date.now` or `performance.now`.

**System order per step** (`simulation/stepWorld.ts`):

1. `enemyAiSystem` — steering and throttle
2. `movementSystem` — player and enemies share the same boat model
3. `playerWeaponSystem`, `enemyWeaponSystem` — cooldowns and shots
4. `projectileSystem` — flight, range, hits, damage
5. `collisionSystem` — ship↔island, ship↔ship, arena bounds
6. `damageSystem` — ramming, removal of destroyed enemies, score, repair, defeat
7. `spawnSystem`
8. `matchSystem` — timer, end by time

**Config.** Each match uses `createMatchConfig(options)`: a frozen snapshot of `GAME_CONFIG` plus the saved options. Changes made mid-match only affect the next match.

**Movement** (arcade). A ship is driven by `ShipControl` (throttle 0…1, rudder −1…1), from input for the player and from AI for enemies. The rudder turns at a fixed `turnSpeed`; speed moves linearly toward `maxSpeed × throttle`. Hitting an obstacle removes only the speed component pointing into it, so ships slide along coasts.

**Player weapons.** Front cannon (one projectile from the bow) and left/right broadsides (3 parallel projectiles, perpendicular to the hull). Each has its own cooldown in `World.playerCooldowns`; holding the key repeats at that pace.

**Enemies.** Every kind is an `EnemySpec` in `src/config/enemies.ts`. Systems never check a kind by name: a spec with a `weapon` behaves as a shooter, one with `ramDamage` rams. Adding or rebalancing an enemy only touches that file.

| Kind        | Behaviour                                                                |
| ----------- | ------------------------------------------------------------------------ |
| Chaser      | Chases the player; on contact deals ram damage and explodes (no point)   |
| Shooter     | Approaches, stops inside `keepDistance`, fires when in range and aligned |
| Big Shooter | Shooter with more HP and a weaker shot, drawn larger                     |

- **Pathing** (`simulation/navigation.ts`): one BFS flow field over water cells toward the player's cell, shared by all enemies and rebuilt only when the player changes cell. Each enemy aims 2 cells down the field, or straight at the player when close.
- **Spawn:** one enemy every `spawn.intervalSec` of active play (first one after one interval). Kind drawn by `spawnWeight`; point drawn among the map's `E` cells that are ≥ 700 px from the player, off islands and free of other enemies. If none qualifies, that spawn is skipped.

**Damage and score.**

- A projectile damages once, then is removed in the same step. It is also removed on range, island or leaving the arena. Player shots only hit enemies; enemy shots only hit the player.
- Destroyed enemies leave `World.enemies` in the same step, so they stop moving, shooting, colliding and dealing damage at once. Their sinking is only drawn by the view.
- +1 point per enemy destroyed by the player's shots. A Chaser that rams gives none.
- **Repair:** every 3 points the player recovers 10 HP (capped, never revives).

**Match end.** `World.endReason` is `timeUp` (active time reached the session time) or `playerDestroyed` (HP 0; wins if both happen in the same step). Once set, `stepWorld` returns early: movement, attacks, damage, spawns and scoring stop.

**Pause.**

- Manual (button or `Esc`) and automatic on `blur` / `visibilitychange`. Resuming requires a player action.
- `PauseProvider` owns `paused`; `GameCanvas` calls `Game.setPaused`. While paused, `Game` drops every frame callback, so the clock, cooldowns, spawns and animations freeze and the accumulator does not grow.
- Input is cleared on pause and on resume, so nothing accumulates.
- `Esc` is handled only by `MatchScreen` (with `preventDefault`), otherwise the just-opened `<dialog>` would close on the same key press.

**Restart** always builds a new `World`; the old one is never reset in place.

## 4. Collisions and arena

| Pair                       | Shapes                                                                 |
| -------------------------- | ---------------------------------------------------------------------- |
| ship ↔ ship                | circle vs circle; pushed apart by half the overlap each                |
| ship ↔ island              | 3 circles along the hull (stern, centre, bow) vs convex polygons (SAT) |
| projectile ↔ ship          | circle vs hull capsule                                                 |
| projectile ↔ island        | circle vs convex polygon; projectile removed                           |
| ship / projectile ↔ bounds | ship clamped (centre circle); projectile removed                       |

- Islands resolve along the minimum translation vector (`physics/collision.ts`), so ships slide instead of sticking. The three hull circles keep the bow out of the coast on a head-on hit.
- The player and a Chaser are not pushed apart: the Chaser must touch to explode.
- **No broad phase** (brute force). The 3-minute profile peaks at 44 enemies and stays at 60 FPS, so a spatial grid is not needed.

**Arena.** A fixed, hand-authored 16×9 map of 128 px cells (2048×1152 px), in `game/arena/maps/mediterranean.ts`, written as two ASCII layers:

- `grid`: water, sand, grass, player spawn `P`, enemy spawns `E`.
- `features`: forts, beach props and decorations on land.

`buildTileMap` validates both layers and throws a descriptive error. Autotiling picks each coast piece from its neighbours. Island collision polygons come from the same map: corner cells use the rounded outline of their tile, the rest is merged into rectangles. `?debugIslands` (dev only) draws them.

## 5. Rendering and resources

**Assets.** `game/assets/manifest.ts` defines the `PIXI.Assets` bundles (`tiles`, `ships`, `effects`, `hud`). `loadGameAssets` reports progress and errors before combat starts; the UI offers **Retry**. Textures load once and are reused; tiles load as individual files (sheet slicing bled pixels at fractional scale).

**Layers** (bottom → top): map → wakes → effects under → ship shadows → hulls → projectiles → effects over → health bars.

**Views** read `World` every frame and own no gameplay state. `Game` passes the frame time to them, so pausing the loop freezes them all.

- `ShipView`: hull sprite by HP stage (damage deterioration), hit flash, recoil, sea sway, wake, health bar above every ship (player included), sinking animation.
- `EnemiesView`: keeps a destroyed enemy's view until it has sunk, then destroys it.
- `ProjectilesView`, `EffectsView`: **pooled** sprites (effects capped at 700). Effects cover muzzle flash, impacts, explosions, smoke/fire on damaged ships, crew overboard.
- `prefers-reduced-motion` disables sway, recoil and screen shake.

**Viewport** (`render/PixiRenderer.ts`): `resolution`/`autoDensity` from the DPR, contain-fit of the whole arena (aspect ratio preserved), recomputed by a `ResizeObserver`. The letterbox shows scenery only. `screenToArena` maps pointer coordinates to arena coordinates.

**Audio.** `SoundManager` plays match sounds from `WorldEvent`s (cloned `HTMLAudioElement`s, so shots overlap). Menu sounds and the ambience loop live in `shared/audio`; a global mute applies everywhere.

**Cleanup.** `Game.destroy()` releases, in order: ticker, listeners, timers, stage children, effect textures, the application, audio. Verified over 5 play cycles (§10).

## 6. Input

- Abstract actions: `forward`, `rotateLeft`, `rotateRight`, `fireFront`, `fireLeft`, `fireRight`, `pause`. Moving and firing work at the same time.
- `KEY_BINDINGS` (`input/bindings.ts`, by `KeyboardEvent.code`) is the single source for the `InputManager`, the on-screen hints and the Controls list. Keys are in [README.md](README.md#controls).
- `InputManager` listens on `window`, only while gameplay is active and not paused. It calls `preventDefault` only for bound keys, ignores form fields, and clears state on `blur` / hidden tab.
- **Touch:** each on-screen button captures its pointer and holds its action until release, so multi-touch works (move, turn and fire together). `.game-canvas` uses `touch-action: none`.
- **Mobile:** landscape recommended (the arena is 16:9); portrait works without clipping. Compact HUD and controls under `(max-width: 600px), (max-height: 480px)`.

## 7. Local persistence

All access goes through `storage/localStore.ts` (`readStore(entry, schema, fallback)`): namespaced, versioned keys (`constants/storage.ts`), `try/catch`, Zod validation and fallback to defaults.

| Key                 | Content                                 | Module                         |
| ------------------- | --------------------------------------- | ------------------------------ |
| options             | session time, spawn interval            | `storage/optionsStorage.ts`    |
| muted               | global sound mute                       | `shared/audio/mute.ts`         |
| player name         | captain name (`null` until set)         | `storage/playerStorage.ts`     |
| last result         | last completed match, shown on the menu | `storage/lastResultStorage.ts` |
| pending submissions | unconfirmed match records               | `api/pendingSubmissions.ts`    |
| mock DB             | confirmed records (MSW "server")        | `mocks/mockDb.ts`              |
| scenario            | selected MSW scenario                   | `mocks/scenarios`              |

An abandoned match (refresh or leaving the match screen) is never recorded.

## 8. Ranking and match history

**Contracts** (`schemas/match.ts`, Zod — one source for types and runtime checks, shared by client and MSW):

- `MatchRecord`: matchId, playerId, playerName, date (ISO), score, durationSec (active), endReason (`timeUp` | `playerDestroyed`), config.
- `RankingEntry`: a record plus its 1-based `position`.
- `Page<T>`: items, page, pageSize, totalItems, totalPages.
- `ApiError` and `SubmitMatchResponse` (`record`, `created`).

Every response is parsed with its schema; a payload outside the contract is a query error and is not retried.

**Endpoints:**

| Method | Path                                                   | Returns                                                    |
| ------ | ------------------------------------------------------ | ---------------------------------------------------------- |
| GET    | `/api/ranking?sessionTime&spawnInterval&page&pageSize` | `Page<RankingEntry>`                                       |
| GET    | `/api/matches?playerId&page&pageSize`                  | `Page<MatchRecord>`, newest first                          |
| PUT    | `/api/matches/:matchId`                                | `201 {created: true}` or `200 {created: false}` + existing |

Invalid input returns `400` with an `ApiError`. The PUT is an idempotent upsert: the existing record is never overwritten.

**Ranking rules:** only matches with the same configuration are compared; one entry per match; tie-break score desc → durationSec asc → date asc → matchId asc.

**Layers:** `api/httpClient.ts` (single Axios instance) → `api/services/<service>/service.ts` (Axios calls + schema parsing) → `queries.ts` (query keys, `queryOptions`/`mutationOptions`) → `src/hooks` (`useRanking`, `useMatchHistory`, `useSubmitMatch`). Components only use the hooks.

**Cache (TanStack Query):**

- `staleTime` 30 s; refetch when the tab becomes visible again.
- Up to 3 retries with exponential backoff (500 ms → 8 s), never on 4xx.
- Pagination keeps the previous page on screen while the next loads.
- Abort signals + per-page query keys: a late response never overwrites newer data.
- A successful submit invalidates both ranking and history.

**Submission and recovery:**

1. `onMutate` adds the record to the pending queue (`localStorage`, one entry per `matchId`).
2. On success it is removed; on failure it stays.
3. `useResendPendingOnStart` resends the whole queue on page load. The menu shows how many records are unsaved, with **Try again**.
4. Resends hit the idempotent PUT, so no duplicates. A pending record never blocks a new match.

## 9. MSW mocks

- The same contracts, fixtures and handlers run in dev, tests and the published build.
- `main.tsx` renders the app at once and starts the worker in parallel; an Axios interceptor holds requests until it is ready. If the worker fails, only the Captain's Log shows errors — game, options and menu keep working.
- `mockDb.ts` = deterministic fixtures (~40 matches, 3 configs) + confirmed records persisted in `localStorage`.
- `simulateNetwork(endpoint)` runs at the start of every handler and applies the active scenario (delay or failure). Scenario list: [README.md](README.md#network-scenarios-msw). Latency is driven by the seeded RNG, so it repeats on every load.
- **Selection:** `?scenario=<id>` or the `ScenarioPanel`; the page reloads so cache and in-memory state start clean. **Reset mock data** clears records, pending queue, last result and scenario.

## 10. Testing and profiling

- **Playwright:** projects `desktop` (1280×720) and `mobile` (Pixel 7 landscape, touch). Each test uses a fresh context and fails on any `pageerror` or `console.error`. HTML report + traces on failure.
- **Test hooks** (`src/testing/testHooks.ts`, only with `VITE_GAME_TEST=true`): `?seed=N`, a manual clock (`__GAME_TEST__.advance(sec)` runs fixed steps) and a read-only `state()`. Movement and combat go through real keyboard and touch events.
- **Seeds** (`SEEDS` in `tests/helpers/game.ts`, measured with 60 s / 10 s options): `survivor` (3) survives the session while fighting back; `shooterFirst` (1) spawns a Shooter first; `mixed` (7) brings a Chaser then Shooters.
- **Visual regression:** menu, arena (seeded, frozen) and result, per project, baselines in `tests/visual/__snapshots__/`.

| §8  | Spec                       | Covers                                                         |
| --- | -------------------------- | -------------------------------------------------------------- |
| 1   | `options.spec.ts`          | limits, persistence, invalid storage, mid-match changes        |
| 2   | `assets-loading.spec.ts`   | progress, failure, **Retry**                                   |
| 3   | `movement.spec.ts`         | forward, rotations, arena bounds, islands                      |
| 4   | `combat.spec.ts`           | front/broadside, cooldowns, damage, one point per kill         |
| 5   | `enemies.spec.ts`          | spawn interval/distance, Chaser ram, Shooter fire              |
| 6   | `match-end.spec.ts`        | time up, death, frozen simulation, clean restart               |
| 7   | `pause.spec.ts`            | manual, `Esc`, blur, hidden tab; clock and cooldowns frozen    |
| 8   | `result.spec.ts`           | result data, save status, focus, last result after refresh     |
| 9   | `navigation-touch.spec.ts` | abandoned match, repeated navigation, multi-touch              |
| 10  | `ranking-history.spec.ts`  | pagination, keyboard tabs, loading, empty, error               |
| 11  | `submission.spec.ts`       | one record in both tabs, pending after failure, resend on load |
| 12  | `retry-race.spec.ts`       | resend after write timeout, late page ignored                  |

- **Bugs the suite found:** late progress callbacks hid the **Retry** button after an asset failure; `showModal()` focused the scroll panel instead of the primary button on mobile (`Modal` now focuses `data-autofocus`).
- **Profiling** (`npm run profile`, report in [`docs/profiling/`](docs/profiling/README.md)): production build, 3-minute match at 180 s / 3 s, then 5 play-and-exit cycles with forced GC. On an i5-10210U (UHD Graphics), Chromium 153, 1280×720: **60 FPS, p95 16.7 ms, up to 44 enemies**; DOM nodes, listeners and canvases stay flat across cycles.

## 11. Balancing decisions

All values live in `src/config/gameConfig.ts` (`GAME_CONFIG`, frozen) and `src/config/enemies.ts`.

| Value                        | Setting                                    | Why                                                              |
| ---------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| Player speed / accel / drag  | 210 px/s, 320 / 240 px/s²                  | Crosses the arena in ~10 s; ~0.7 s to full speed, ~0.9 s to stop |
| Player turn                  | 2.5 rad/s                                  | Turn radius ~84 px, under one tile; can turn in place            |
| Chaser speed / turn          | 150 px/s, 2.0 rad/s                        | Can be outrun, but catches a player who turns a lot              |
| Shooter speed / turn         | 125 px/s, 1.7 rad/s                        | Slowest turner: the player can sail out of its aim               |
| Shooter hold / attack range  | 380 / 560 px                               | Stops well inside its range and fires from a distance            |
| Shooter aim / cooldown       | 0.14 rad / 2.2 s                           | Fires only when well aligned, not often                          |
| Enemy projectile             | 400 px/s, 620 px                           | ~1.5 s of flight: dodgeable                                      |
| Spawn distance               | ≥ 700 px                                   | ~3 s of sailing: never an immediate hit                          |
| Spawn weights                | Chaser 0.2, Shooter 0.56, Big Shooter 0.24 | Both required types appear in a default match                    |
| Front cannon                 | 0.45 s, 720 px/s, 720 px                   | One fast, long shot, fired often                                 |
| Broadside                    | 1.2 s per side, 620 px/s, 460 px, 3 shots  | More damage per volley, so slower and shorter                    |
| Player HP / shot damage      | 100 / 5.75                                 | A full broadside is worth 17.25                                  |
| Chaser HP / ram              | 30 / 10                                    | Two broadsides kill it; ten rams sink the player                 |
| Shooter HP / shot            | 45 / 5                                     | 8 shots to sink; 20 hits sink the player                         |
| Big Shooter HP / shot        | 55 / 4                                     | Toughest hull, weakest shot                                      |
| Repair                       | +10 HP every 3 kills                       | Capped at `maxHp`; never revives a sunk player                   |
| Collision radius / hull half | 34 / 67 px (sprite scale 1.35)             | Fits one-tile (128 px) channels                                  |

**Option limits** (`src/config/options.ts`):

| Option            | Min  | Max   | Step | Default |
| ----------------- | ---- | ----- | ---- | ------- |
| Game session time | 60 s | 180 s | 10 s | 120 s   |
| Enemy spawn time  | 1 s  | 10 s  | 1 s  | 3 s     |

Whole-second steps keep the number of distinct configurations small, so ranking groups stay populated.

## 12. Known limitations

- **One local player per browser**, no authentication: `playerId` is always `local-player`.
- **The "server" lives in the browser:** the ranking is per browser; other captains are fixtures.
- **Refresh abandons the match** (by design, brief §3).
- **No collision broad phase** — fine up to the measured 44 enemies.
- **Enemy shots pass through other enemies**, and enemies push each other apart instead of steering around.
- **Map art:** the tileset has no concave-corner pieces, so inner coast corners are square notches.
- **Audio** uses cloned `HTMLAudioElement`s, not Web Audio: each shot creates an element.
- **Memory:** after the first match the heap grows ~0.2 MB per cycle, from V8 compiled code, Pixi's shader cache and service-worker bookkeeping — not game objects.
- **Visual baselines** depend on the machine's fonts and GPU; another OS may need `npm run test:visual:update`.
- **Mobile:** portrait works, but the 16:9 arena is small; landscape recommended.

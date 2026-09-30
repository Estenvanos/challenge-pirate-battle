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

### Screens

- `app/App.tsx` holds a typed screen state (`menu` | `options` | `log` | `match`). There is no router: a refresh always lands on the menu, which abandons any running match.
- **Menu:** Play, Options, and shortcuts to the Captain's Log tabs.
- **Options:** steppers for session time and spawn interval, saved on every change (`storage/optionsStorage.ts`).
- **Captain's Log:** `Ranking` and `Match History` tabs (WAI-ARIA tabs, arrow-key switching). The ranking is filtered by the current options; history shows the local player (`config/player.ts`). Both use 5 rows per page.
- **Player name:** Play opens the `PlayerNameDialog` modal when no name is saved yet. It uses a native `<dialog>` (`showModal()` traps focus, makes the page inert and restores focus on close) inside the same `Panel`. The input is framed with the secondary button sprite. The name is validated (2–16 chars; letters, numbers, spaces, `'`, `-`, `_`), saved, and the match starts. `playerId` stays fixed as `local-player`.
- **Match:** Play freezes a snapshot of the options and opens the full-viewport match screen: `GameCanvas` (the Pixi arena with the player's ship) plus a Main Menu button and a keyboard controls hint rendered from `KEY_BINDINGS`. While assets load it shows progress; on failure it offers **Retry**, which remounts the canvas via a `key` bump. `TouchControls` shows the sample's on-screen buttons (round button sprites, 64 px): movement at the bottom left (forward on top, turn left and right below) and weapons at the bottom right (front on top, left and right broadsides below). For now they are **static** (no action); they will map to the input actions in §6. Each button shows its keyboard keys below it, read from `KEY_BINDINGS` (`game/input/bindings.ts`, the same source the `InputManager` uses) and exposed through `aria-keyshortcuts`. Buttons whose action has no key binding yet (the weapons) show no caption. In the match the Jungle Gaming logo moves up so it doesn't cover the weapon buttons, and in dev the TanStack Query Devtools button sits at the top right. HUD, combat and result are not implemented yet.
- UI chrome uses the provided sprites: `panel_menu.png` as a 9-slice `border-image` (atlas borders 32/40 px), menu and round buttons with their normal/hover/pressed/disabled sprites (1x/2x via `image-set`/`srcSet`). Global styles live in `public/style.css`. Buttons scale up on hover and focus, and the scaling is disabled under `prefers-reduced-motion`.
- Menu buttons play `ui_hover.wav` on mouse hover and `ui_click.wav` on click (`shared/audio/uiSounds.ts`, one cached `HTMLAudioElement` per sound). Audio blocked by the browser's autoplay policy is ignored silently.

- `features/match/GameCanvas.tsx` creates one `Game` on mount and calls `game.destroy()` on unmount.
  - Init is async, so a `cancelled` guard destroys the instance if the component unmounted during init. This keeps it correct under React Strict Mode's double mount.
  - `destroy()` is idempotent.
- `Game` (`game/core/Game.ts`) wires together `GameLoop`, `World`, the systems, `InputManager`, `PixiRenderer` and `SoundManager`.
- The UI is synced from the game in two ways. Neither causes a React render every frame.
  - **Snapshots:** `gameStore` publishes a throttled snapshot (HP, score, remaining time, pause state). React reads it with `useGameSnapshot` (`useSyncExternalStore`).
  - **Events:** `EventBus` emits discrete events (enemy destroyed, player hit, match ended, paused/resumed). The HUD, `LiveRegion` and result flow consume them.
- Each match starts from a frozen snapshot of `gameConfig` merged with the saved options.

## 3. Simulation loop

- **Fixed timestep** (`core/GameLoop.ts`, driven by the Pixi ticker through `PixiRenderer.onFrame`): step of 1/60 s (`gameConfig.loop.stepSec`).
  - An accumulator consumes real frame time.
  - The frame delta is clamped to 0.25 s (`loop.maxFrameDeltaSec`) so a long stall cannot trigger an avalanche of steps.
  - Rendering runs once per frame, after the steps. There is no interpolation yet.
- Implemented so far (`simulation/stepWorld.ts`): `enemyAiSystem` → `movementSystem` → `enemyWeaponSystem` → `projectileSystem` → `collisionSystem` (ship↔island, enemy↔enemy, arena bounds) → `spawnSystem`.
- Each match uses `createMatchConfig(options)`, a frozen snapshot of `GAME_CONFIG` plus the saved options (session time, spawn interval).
- Ship movement has inertia, like a boat. Player and enemies share the same model (`movementSystem`), driven by a `ShipControl` (sail open, rudder −1…1): the player's comes from input, and an enemy's comes from its AI. The ship keeps `speed` and `angularVelocity`.
  - Holding forward accelerates it up to `maxSpeed`. Releasing it lets the ship coast and slow down through `drag`.
  - The rudder changes the turn rate gradually (`turnAcceleration`).
  - Turning is stronger at speed. At a standstill the ship keeps only `minRudder` of its turn rate.
  - Hitting an obstacle removes the part of the speed that pointed into it. A head-on hit stops the ship; a glancing one keeps most of the speed while it slides.
- `GameClock` is the only time source. It can be paused, and test hooks can step it by hand.
- `core/random.ts` provides a seeded PRNG (mulberry32). It drives the spawn kind and point. `Game` picks the seed (`GameInitOptions.seed`, or the current time by default).

### Enemies

- **Spawn** (`spawnSystem`): one enemy every `spawn.intervalSec` of active play. The first one appears after one interval.
  - The kind is drawn in proportion to each kind's `spawnWeight`: Chaser 0.5, Shooter 0.35, Big Shooter 0.15.
  - The point is drawn among the map's `E` cells that are at least `spawn.minPlayerDistance` (360 px) from the player's **current** position, do not overlap another enemy, and do not touch an island.
  - If no point qualifies, that spawn is skipped and the next interval tries again.
  - An enemy spawns at rest, facing the player.
- **Speed:** enemies use the player's boat model scaled by 0.8: `maxSpeed`, `acceleration` and `drag` are 80% of the player's. They are about 20% slower, accelerate from rest and coast to a stop the same way.
- **Pathing** (`simulation/navigation.ts`): a flow field (BFS over the water cells, 8-neighbour, no corner cutting) gives each cell its distance to the player's cell. It is shared by all enemies and rebuilt only when the player changes cell.
  - Each enemy aims at the cell `enemies.pathLookahead` (2) steps down the field, and at the player directly once it is that close.
  - The rudder is proportional to the heading error and saturates at `fullRudderAngle`.
- **Kinds** (`src/config/enemies.ts`, exposed as `config.enemies.kinds`): each `EnemySpec` holds the boat motion, `spawnWeight`, `maxHp`, `spriteScale`, the damage sprites and an optional `weapon`. Systems never check the kind by name: a kind with a `weapon` behaves as a shooter, and one without it as a chaser. Adding or rebalancing an enemy only touches this file.
  - **Chaser:** medium red ship, no weapon.
  - **Shooter:** medium yellow ship, armed.
  - **Big Shooter:** a Shooter with twice the HP (6 vs 3), drawn at 1.2× with a matching collision radius (~31 px, so it still fits one-tile channels).
- **Chaser:** keeps the sail open toward the player.
- **Shooter:** approaches with the sail open, and furls it inside `keepDistance`, so it coasts to a stop and keeps turning its bow toward the player.
  - It fires one front projectile when the player is within `attackRange`, the bow is within `aimTolerance` of the player, and its `fireCooldownSec` has elapsed.
- **Projectiles** (`projectileSystem`): they fly straight and are removed after `projectile.range`, on leaving the arena, or on hitting an island. They are drawn with a pooled `Sprite` per projectile (`ProjectilesView`).
- Enemies carry `hp`/`maxHp` (set at spawn), but nothing reduces `hp` yet.
- Not implemented yet: damage, the Chaser exploding on the player, and player weapons. Until then, enemies can overlap the player and enemy projectiles pass through it.
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
- Resolution: ships are pushed out along the minimum translation vector and slide along the obstacle (implemented for the player: `physics/collision.ts` `circleVsPolygon`, SAT over edge normals plus the closest-vertex axis). The ship's circle covers its width, not its length, so the bow can overlap the coast art a little when hitting it head-on. Projectiles are removed on contact.
- Arena bounds clamp ship positions. Projectiles that leave the arena are removed.
- Each projectile applies damage once. After the first hit it is flagged and removed in the same step.
- Broad phase: **TBD** (a brute-force pass may be enough for the expected entity count, pending profiling).

### Arena map

- The arena is a **fixed, hand-authored map**: `game/arena/maps/mediterranean.ts` ("Mediterranean", by Estevan), inspired by the western Mediterranean (Iberia, France, Italy, Corsica/Sardinia, the Balearics, North Africa, Sicily).
- Format: two ASCII layers of the same size, 26×16 cells of 64 px (arena 1664×1024). The full legend is in the map file header.
  - `grid` (terrain): `.` water, `s` sand, `g` grassy land, `P` player spawn, `E` enemy spawn (both on water). Regions of different styles must not touch, because each one draws its own coastline.
  - `features` (on land only, `.` = nothing):
    - **Forts** (`game/arena/features.ts`), connected automatically from their neighbours: `O` tower, picking the piece for 0 connections, 1 connection, straight or corner (tiles 13/29/30/45/46/61/62/77/78/93/94); `Q` hatch tower (14); `#` wall, with rounded caps at open ends (15/16/63/64/79/80); `=` gate (60/76); `%` ruined wall (89–92); `+` widened wall (95/96); `^ v > <` cannon on the wall, facing that way (47/48/31/32). Wall junctions and corners require a tower, and a tower takes at most 2 walls, because the tileset has no pieces for anything else.
    - **Beach props** `b`/`k`/`R` (boat, cannon, rock): coast tiles 81/83/85 on sand and 82/84/86 on grass. They are rotated so the water side faces the real coast, and must sit on a straight stretch of coast.
    - **Decorations** (overlay, variant chosen by position): `r` rocks (49–51), `m` mossy rocks (65–67), `l` foliage (70–72), `f` sprouts (87/88).
- `game/arena/tileMap.ts` (`buildTileMap`, pure) validates both layers: sizes, known characters, exactly one `P`, at least one `E`, features on land, the fort connection rules, and beach props on straight coast. It throws a descriptive error.
- **Autotiling** (`game/arena/autotile.ts`): the piece for each land cell (corner, edge or centre) comes from the 4-neighbour mask of same-style land.
  - Middle pieces are pairs that are continuous in the source art (grass: top 7/8, bottom 55/56, left 22/38, right 25/41, centre block 23 24/39 40), laid out as `a, b, b mirrored, a mirrored` (period 4). Every interior tile therefore touches its original neighbour or its own mirror image, so there are no seams. Repeating a single tile showed every square, and a single mirrored tile formed diamond or band patterns.
  - On an edge or corner, the original piece is used when the neighbouring interior tile is unmirrored (phase 0–1). Otherwise the opposite side's piece is used, mirrored, which is what continues the art.
  - The sand island uses tiles 1–35; the grass island uses 6–57.
- Unused tiles:
  - The 2×2 dune (4/5/20/21) and the sand clearing in grass (36/37/52/53) were tried and removed, because their tone doesn't match the surrounding tiles and they showed as squares.
  - 68/69 (sand with pebbles) have no seamless pairing with the sand interior. Tiles 10–12, 26–28, 42–44, 58/59 and 74/75 are empty in the sheet.
- Cells outside the grid repeat the nearest edge (`groundAt` accepts any coordinate). Coastlines touching the arena border continue off-screen, and the renderer draws a 12-cell margin so the scenery fills the letterbox. The tileset has no concave-corner pieces, so inner corners are square notches.
- Island collision: each corner cell uses the rounded outline of its own corner tile (`CORNER_OUTLINES` in `autotile.ts`, convex hulls measured from the alpha of the art and mirrored like the tile), so a ship only hits where land is actually drawn. The rest of the land is decomposed greedily into maximal rectangles. Every piece is a convex polygon, ready for circle-vs-polygon. Rectangle sides facing water are inset by `COAST_INSET_PX` (2 px, the transparent bevel of the coast art). `ARENA_MAP` (`game/arena/index.ts`) is the resolved map consumed by rendering and, later, by collision and spawn systems.
- Dev aid: `?debugIslands` in the URL (dev only) outlines the collision polygons.

## 5. Rendering and resource management

- `game/assets/manifest.ts` defines the `PIXI.Assets` bundles (ships, effects, tiles, UI).
  - `loadGameAssets` reports progress, surfaces errors and supports retry before combat starts.
  - Retina variants are picked based on DPR (`png/retina`, loaded with `resolution: 2` so logical size is unchanged).
  - Tiles are loaded as the individual `tile_N.png` files, not sliced from `tiles_sheet.png`. With the sheet, linear filtering at the fractional letterbox scale pulled pixels from neighbouring tiles and showed thin lines.
- Bundles: `tiles` (tile_1–96) and `ships` (`SHIP_SPRITES`; the player uses `ship_2`). Ship PNGs have the bow pointing down (+y); `ShipView` adds a −π/2 offset to the entity rotation (0 = +x).
- Sea sway: `ShipView` animates the hull sprite on the Pixi ticker (`PixiRenderer.onFrame`), independently of the simulation. The animation combines roll, pitch (length scale) and heave, using sine waves with different periods, plus a lean out of the turn that follows `angularVelocity`. It is visual only: collision uses the entity, not the sprite.
- Textures are loaded once and reused. Projectile and effect views are pooled.
- Views (`ShipView`, `ProjectileView`, `HealthBarView`, `IslandView`) read from `World` every frame and own no gameplay state.
- Enemy sprites degrade as HP drops (`EnemiesView`): each kind lists its `sprites.stages` (intact → most damaged: red `ship_3/9/15`, yellow `ship_6/12/18`), split evenly over `maxHp`, and a grey `sprites.destroyed` hull (`ship_21`/`ship_24`) shown at 0 HP. `SHIP_SPRITES` is derived from these lists, so every stage is preloaded. The player's ship has no damage stages yet.
- Viewport (`render/PixiRenderer.ts`): sets `resolution` and `autoDensity` from the DPR and fits the whole arena in the host (contain scale, centred), recomputed by a `ResizeObserver`. The letterbox area is filled by the map's off-arena margin (scenery only, not playable). `screenToArena` converts pointer coordinates to arena coordinates.
- `TileMapView` builds the static map once (water, then ground sprites with anchor 0.5, ±1 scale for mirroring and quarter-turn rotation, then the fort/decoration overlays).
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
- Key bindings (`input/bindings.ts`, `KEY_BINDINGS`, by `KeyboardEvent.code`): `W`/`↑` forward, `A`/`←` rotate left, `D`/`→` rotate right. Firing and pause keys are **TBD**. `ACTION_BY_CODE` feeds `InputManager`, and the match screen renders the hint from the same list.
- `InputManager` listens on `window`, calls `preventDefault` only for bound keys, ignores keys typed in form fields, and clears all state on `blur` and when the tab is hidden.

## 7. Local persistence

| Key | Content | Module |
| --- | --- | --- |
| options | session time, spawn interval (validated against `config/options.ts` limits) | `storage/optionsStorage.ts` |
| player name | captain name chosen by the player (`null` until set) | `storage/playerStorage.ts` |
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

Values live in `src/config/gameConfig.ts` (`GAME_CONFIG`, frozen).

| Value | Setting | Why |
| --- | --- | --- |
| Player max speed | 75 px/s | Crosses the 1664 px arena in about 22 s. Slow and deliberate, so positioning matters. |
| Acceleration / drag | 40 / 25 px/s² | About 1.9 s to reach full speed and about 3 s to coast to a stop. |
| Max turn speed | 1.1 rad/s (at full speed) | Turn circle radius of about 68 px, roughly one tile, so channels are still navigable. |
| Turn acceleration | 2.2 rad/s² | About 0.5 s for the rudder to reach full effect, and it keeps turning a little after release. |
| Min rudder | 0.3 | The ship can still turn slowly when stopped, so it never gets stuck facing a coast. |
| Player collision radius | 26 px | About half the hull width of `ship_2`. It fits through one-tile (64 px) channels. |

Option limits (`src/config/options.ts`):

| Option | Min | Max | Step | Default |
| --- | --- | --- | --- | --- |
| Game session time | 60 s | 180 s | 10 s | 120 s |
| Enemy spawn time | 1 s | 10 s | 1 s | 3 s |

Whole-second steps keep the number of distinct configurations small, so ranking groups stay populated.

## 12. Known limitations

**TBD**.

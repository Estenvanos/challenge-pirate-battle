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
- **Options:** steppers for session time and spawn interval, saved on every change (`storage/optionsStorage.ts`). Below them, a **Sound** toggle (On/Muted, `aria-pressed`) mutes every sound in the tab at once: ambience, UI and match sounds. It is global, not part of `GameOptions` (so it never splits the ranking), lives in `shared/audio/mute.ts` (in-memory flag + subscribers, persisted under the `muted` key) and applies immediately, also in the pause menu mid-match.
- **Captain's Log:** `Ranking` and `Match History` tabs (WAI-ARIA tabs, arrow-key switching). The ranking is filtered by the current options; history shows the local player (`config/player.ts`). Both use 5 rows per page.
- **Player name:** Play opens the `PlayerNameDialog` modal when no name is saved yet. It uses a native `<dialog>` (`showModal()` traps focus, makes the page inert and restores focus on close) inside the same `Panel`. The input is framed with the secondary button sprite. The name is validated (2–16 chars; letters, numbers, spaces, `'`, `-`, `_`), saved, and the match starts. `playerId` stays fixed as `local-player`.
- **Match:** Play freezes a snapshot of the options and opens the full-viewport match screen: `GameCanvas` (the Pixi arena with the player's ship) plus a top-right bar with the `Hud` counters (score, then time left) and the round Pause button, in the sample's order. The `Hud` (`features/match/Hud.tsx`, a `<dl>` over the `counter_panel`/`icon_score`/`icon_time` sprites) shows the **live** score and time left from `useGameSnapshot` (the full session time while the arena loads), and, on a second row below the counters, right-aligned with the Pause button, the player's **live** health from `useGameSnapshot` (`icon_heart` plus the `health_frame` bar; the fill is clipped to `hp / maxHp` and turns from green to amber at 2/3 and red at 1/3). Pausing opens `PauseMenu` (`sample_pause.png`), with `ui_open.wav` when it opens and `ui_close.wav` when it closes (played by `MatchScreen` on the change of `paused && !result`, not on mount): the shared `Modal` with **Resume**, **Options** (the same steppers as the Options screen, `OptionsFields`; changes apply to the next match) and **Main Menu**. While assets load, `ArenaLoading` (`features/match/ArenaLoading.tsx`) covers the whole match (HUD and controls included) with the menu background and a `Panel`: the title art, the player's ship (`ship_2`, bobbing, turned to face right) sailing along a progress bar built from the HUD's `health_frame`/`health_fill_green` sprites (`role="progressbar"`), and a tip. On failure the same panel offers **Retry**, which remounts the canvas via a `key` bump. `TouchControls` (rendered by `GameCanvas`, next to the Pixi host) shows the sample's on-screen buttons as two compact triangles (round button sprites, 64 px; 56 px on mobile): movement at the bottom left (forward on top, turn left and right side by side below) and weapons at the bottom right (front on top, left and right broadsides below). Holding a button holds its input action (§6). A weapon button is covered by a white veil while that weapon reloads: `Game` reports the remaining cooldown of each weapon (`onCooldowns`, 1 → 0, only when it changes) and `GameCanvas` writes it to the CSS variables `--cooldown-front|left|right` on `.game-canvas`, so there is no React render per frame and the veil freezes on pause. Each button shows its keyboard keys below it (hidden on `pointer: coarse` devices), read from `KEY_BINDINGS` (`game/input/bindings.ts`, the same source the `InputManager` uses) and exposed through `aria-keyshortcuts`. In the match the Jungle Gaming logo moves up so it doesn't cover the weapon buttons, and in dev the TanStack Query Devtools button sits at the top left. Score, the match timer and the result screen are not implemented yet.
- UI chrome uses the provided sprites: `panel_menu.png` as a 9-slice `border-image` (atlas borders 32/40 px), menu and round buttons with their normal/hover/pressed/disabled sprites (1x/2x via `image-set`/`srcSet`). Global styles live in `public/style.css`. Buttons scale up on hover and focus, and the scaling is disabled under `prefers-reduced-motion`.
- Menu buttons play `ui_hover.wav` on mouse hover and `ui_click.wav` on click (`shared/audio/uiSounds.ts`, one cached `HTMLAudioElement` per sound). Audio blocked by the browser's autoplay policy is ignored silently.
- **Ambience** (`shared/audio/ambience.ts`, started by an effect in `App`, so it plays on every screen): the provided `ocean_ambience_loop.wav` on loop, plus one of three `parrot_squawk_N.wav` clips at a random interval of 15–40 s. It starts on the first pointer or key press (autoplay policy), pauses while the tab is hidden, and keeps playing while the match is paused. The parrot clips are not part of the provided assets; their source and licence are in `CREDITS.md`.

- `features/match/GameCanvas.tsx` creates one `Game` on mount and calls `game.destroy()` on unmount.
  - Init is async, so a `cancelled` guard destroys the instance if the component unmounted during init. This keeps it correct under React Strict Mode's double mount.
  - `destroy()` is idempotent.
- `Game` (`game/core/Game.ts`) wires together `GameLoop`, `World`, the systems, `InputManager`, `PixiRenderer` and `SoundManager`.
- The UI is synced from the game in two ways. Neither causes a React render every frame.
  - **Snapshots:** `gameStore` (`game/bridge`) holds the snapshot and React reads it with `useGameSnapshot` (`useSyncExternalStore`). It carries the player's HP, the score and the time left in whole seconds. `Game` reports them through `GameInitOptions` callbacks (`onPlayerHealth` on each hit, `onScore` on each kill, `onTimeLeft` once per second), `GameCanvas` forwards them to `gameStore` and resets the store when the match unmounts. All three change at discrete moments, so React never renders per frame.
  - **Match end:** `Game` calls `onMatchEnd` once with a `MatchResult` (score, active duration, end reason), 1 s of frame time after the simulation ends so the last explosion is seen. `MatchScreen` keeps the result in state, submits the record and shows the result dialog.
  - **Events:** `EventBus` emits discrete events (enemy destroyed, player hit, match ended, paused/resumed). The HUD, `LiveRegion` and result flow consume them.
- Each match starts from a frozen snapshot of `gameConfig` merged with the saved options.

## 3. Simulation loop

- **Fixed timestep** (`core/GameLoop.ts`, driven by the Pixi ticker through `PixiRenderer.onFrame`): step of 1/60 s (`gameConfig.loop.stepSec`).
  - An accumulator consumes real frame time.
  - The frame delta is clamped to 0.25 s (`loop.maxFrameDeltaSec`) so a long stall cannot trigger an avalanche of steps.
  - Rendering runs once per frame, after the steps, and **interpolates**: `stepWorld` stores each ship's and projectile's previous transform (`prevX`, `prevY`, `prevRotation`) at the start of a step, and `GameLoop` passes `alpha = accumulator / stepSec` to `render`, so views draw between the previous and the current state. Without it, 210 px/s stutters on displays above 60 Hz.
- Implemented so far (`simulation/stepWorld.ts`): `enemyAiSystem` → `movementSystem` → `playerWeaponSystem` → `enemyWeaponSystem` → `projectileSystem` (applies projectile damage) → `collisionSystem` (ship↔island, ship↔ship, arena bounds) → `damageSystem` (ramming, removal of destroyed enemies, scoring, defeat) → `spawnSystem` → `matchSystem` (match timer, end by time).
- Each match uses `createMatchConfig(options)`, a frozen snapshot of `GAME_CONFIG` plus the saved options (session time, spawn interval).
- Ship movement is arcade-style. Player and enemies share the same model (`movementSystem`), driven by a `ShipControl` (`throttle` 0…1, rudder −1…1): the player's comes from input, and an enemy's comes from its AI.
  - The rudder turns the ship directly at `turnSpeed`, with no angular inertia, and equally at rest or at speed.
  - The speed moves linearly toward `maxSpeed × throttle`: up at `acceleration`, down at `drag`.
  - Hitting an obstacle removes the part of the speed that pointed into it. A head-on hit stops the ship; a glancing one keeps most of the speed while it slides.
- `GameClock` is the only time source. It can be paused, and test hooks can step it by hand.
- `core/random.ts` provides a seeded PRNG (mulberry32). It drives the spawn kind and point. `Game` picks the seed (`GameInitOptions.seed`, or the current time by default).

### Enemies

- **Spawn** (`spawnSystem`): one enemy every `spawn.intervalSec` of active play. The first one appears after one interval.
  - The kind is drawn in proportion to each kind's `spawnWeight`: Chaser 0.2 (1 in 5), Shooter 0.56, Big Shooter 0.24.
  - The point is drawn among the map's `E` cells that are at least `spawn.minPlayerDistance` (700 px) from the player's **current** position, do not overlap another enemy, and do not touch an island.
  - If no point qualifies, that spawn is skipped and the next interval tries again.
  - An enemy spawns at rest, facing the player.
- **Speed:** enemies use the player's boat model with their own values per kind: Chaser 150 px/s (turn 2.0 rad/s), Shooter and Big Shooter 125 px/s (turn 1.7 rad/s), against the player's 210 px/s. Their throttle is `max(minTurnThrottle, cos(heading error))`, so they slow down in turns.
- **Pathing** (`simulation/navigation.ts`): a flow field (BFS over the water cells, 8-neighbour, no corner cutting) gives each cell its distance to the player's cell. It is shared by all enemies and rebuilt only when the player changes cell.
  - Each enemy aims at the cell `enemies.pathLookahead` (2) steps down the field, and at the player directly once it is that close.
  - The rudder is proportional to the heading error and saturates at `fullRudderAngle`.
- **Kinds** (`src/config/enemies.ts`, exposed as `config.enemies.kinds`): each `EnemySpec` holds the boat motion, `spawnWeight`, `maxHp`, `spriteScale`, the damage sprites and an optional `weapon`. Systems never check the kind by name: a kind with a `weapon` behaves as a shooter, and one without it as a chaser. Adding or rebalancing an enemy only touches this file.
  - **Chaser:** medium red ship, no weapon.
  - **Shooter:** medium yellow ship, armed.
  - **Big Shooter:** large blue ship; a Shooter with more HP (55 vs 45) and a weaker shot (4 vs 5 damage), drawn at 1.2× the medium ship with a matching collision radius (~41 px, so it still fits one-tile channels).
  - All ships are drawn at `player.spriteScale` (1.35); `radius` (34 px) and `hullHalfLength` (67 px) follow it.
- **Chaser:** sails toward the player.
- **Shooter:** approaches, and drops the throttle to 0 inside `keepDistance`, so it stops and keeps turning its bow toward the player.
  - It fires one front projectile when the player is within `attackRange`, the bow is within `aimTolerance` of the player, and its `fireCooldownSec` has elapsed.
- **Projectiles** (`projectileSystem`): they fly straight and are removed after their weapon's `range`, on leaving the arena, on hitting an island, or on hitting a hull: player shots only hit enemies, enemy shots only hit the player. The hull is a capsule: the stern-to-bow segment thickened by `radius`, the same shape as the three circles used against islands. A hit applies the projectile's `damage` and removes it in the same step (`projectileEnded` with cause `ship`), so it damages once. Speed, range and damage belong to each weapon (`ProjectileSpec`); each projectile carries its `owner`, `range` and `damage`. They are drawn from a pool (`ProjectilesView`).
- **Health and damage** (`damageSystem.ts`): every ship carries `hp`/`maxHp` (player 100, Chaser 30, Shooter 45, Big Shooter 55). `applyDamage` lowers `hp` (never below 0) and pushes `shipDamaged`.
  - **Ramming:** a kind with `ramDamage` (the Chaser, 10) that touches the player (its three hull circles against the player's capsule) damages the player and goes to 0 HP itself.
  - **Destroyed enemies** are removed from `World.enemies` in the same step (`enemyDestroyed`, with cause `shot` or `ram` for the future score), so no other system has to skip them: they stop shooting, colliding and dealing damage at once. The sinking is drawn by the view (§5).
  - **Player at 0 HP:** `World.ended` is set and `playerDestroyed` is pushed. `stepWorld` then returns right after saving the previous transforms, so movement, attacks, damage and spawns stop. The result screen is not implemented yet; the player leaves through the pause menu.
- **Player weapons** (`playerWeaponSystem`, values in `config.player.weapons`): three weapons, each with its own cooldown kept in `World.playerCooldowns`. Holding the action repeats the shot at the cooldown's pace.
  - **Front:** one projectile from the bow.
  - **Left / right broadside:** `side.shots` (3) parallel projectiles, perpendicular to the hull, spaced `shotSpacing` apart along it.
  - Projectiles are created by `spawnProjectile` (`projectileSystem.ts`), shared with the enemies, at the hull's edge: `hullHalfLength` ahead for the front cannon, `radius` to the side for a broadside.
- **Events** (`World.events`, type `WorldEvent`): the simulation pushes `shotFired` (weapon, ship, muzzle position, angle, shot count), `projectileEnded` (position and cause: `range`, `island`, `bounds` or `ship`), `enemySpawned`, `shipDamaged` (ship and impact point), `enemyDestroyed` and `playerDestroyed`. `Game` drains the list after every step and turns the events into sound and visual effects (§5). The simulation itself never touches audio or rendering.
- **Shot sounds:** on `shotFired`, `Game` plays the sound through `SoundManager` (`game/audio/SoundManager.ts`): `cannon_fire_1–3.wav` in rotation for a front shot, `cannon_broadside.wav` for a broadside. Each play uses a clone of the preloaded `HTMLAudioElement`, so consecutive shots overlap.
- **Damage sounds:** `ship_wood_hit_1–2.wav` on `shipDamaged`, `ship_explosion_1–2.wav` on a destroyed ship, plus `ship_sinking.wav` and `game_over.wav` when it is the player.
- Not implemented yet: score, the match timer and the result flow.
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
  - Implementation: `PauseProvider` (`features/match/PauseProvider.tsx`, mounted in `AppProviders` around the whole app) owns the `paused` state; `usePause()` reads and sets it. `MatchScreen` sets it (pause button, `Esc`, `blur`, `visibilitychange`) and clears it when the match unmounts; `GameCanvas` reads it and calls `Game.setPaused`. `Esc` toggles: the `MatchScreen` key listener is the only handler and calls `preventDefault`, otherwise the just-opened `<dialog>` would treat the same key press as a close request and resume at once. While paused, `Game` drops every frame callback (the loop, and with it the views' animations and effects), so nothing steps and the accumulator does not grow. Momentum (`speed`, cooldowns, spawn timer) simply stays in `World`, so resuming continues from the same state. The Pixi ticker keeps running, so a resize while paused still redraws. `InputManager.enabled` is off while paused, so game keys are neither captured nor blocked in the menu.
- **Score:** `World.score` gains 1 point in `damageSystem` when an enemy destroyed by the player's shots leaves the world. The enemy is removed in that same step, so a kill counts once; a Chaser that rams the player gives no point.
- **Repair:** every `player.repair.everyKills` (3) points, the player recovers `player.repair.amount` (10) HP, capped at `maxHp`. A player already at 0 HP is not revived, and a player at full HP gets nothing (no animation either). The simulation emits `playerRepaired`; `Game` updates the HUD and calls `ShipView.heal()`, which plays a quick green aura around the hull (0.5 s, under the ship) and a green plus sign rising from it (0.9 s, above everything). Both sprites (`heal_aura.png`, `heal_plus.png` in `png/default/effects`) were made for this game, generated with a script, and are created lazily on the first repair.
- **Match end:** `World.endReason` is `null` while the match runs. `damageSystem` sets `playerDestroyed` when HP reaches 0; `matchSystem` counts `World.elapsedSec` (active play only, so pauses do not count) and sets `timeUp` when it reaches the session time. Defeat wins if both happen in the same step. Once ended, `stepWorld` returns early: movement, attacks, damage, spawns and scoring stop.
- **Result** (`features/result/ResultDialog.tsx`, `sample_result.png`): the shared `Modal` titled **Battle Complete** (time up) or **Game Over** (defeated), with the score (in the `Rye` font, self-hosted, carved into a CSS wooden plank), the time played, the end reason, the status of the record submission (saving, saved, or failed with **Try again**) and the **Play Again** and **Main Menu** actions. The title is framed by a smaller copy of the `panel_menu.png` 9-slice (`.result__title`). `Esc` does not close it and the pause menu cannot open over it. `App` gives each match a `matchId` (`crypto.randomUUID()`), used as the React key of `MatchScreen` (Play Again remounts it with a fresh `World`) and as the id of the record sent through `useSubmitMatch`, so a retry never duplicates it. Not implemented yet: the pending-submission queue and the persisted last result (§7, §8).
- **Restart:** builds a new `World`. The old one is not reset in place.

## 4. Collisions

- Projectiles are circles. A ship is a circle of `radius` (half its width) against other ships, and three such circles along the hull (stern, centre, bow, spanning `hullHalfLength`) against islands.
- Islands are convex polygons (or sets of them) built from the tile map.
- Tests used:
  - circle vs circle for ship↔ship and projectile↔ship;
  - circle vs polygon for ship↔island and projectile↔island.
- Ship↔ship: every overlapping pair (player included) is pushed apart by half the overlap each, using the `radius` circles. The only exception is the player against a ramming kind (Chaser), which must touch the player to explode.
- Resolution against islands: ships are pushed out along the minimum translation vector and slide along the obstacle (`physics/collision.ts` `circleVsPolygon`, SAT over edge normals plus the closest-vertex axis). The three hull circles keep the bow out of the coast on a head-on hit. Arena bounds still use the centre circle only. Projectiles are removed on contact.
- Arena bounds clamp ship positions. Projectiles that leave the arena are removed.
- Each projectile applies damage once. After the first hit it is flagged and removed in the same step.
- Broad phase: **TBD** (a brute-force pass may be enough for the expected entity count, pending profiling).

### Arena map

- The arena is a **fixed, hand-authored map**: `game/arena/maps/mediterranean.ts` ("Mediterranean", by Estevan), inspired by the western Mediterranean (Iberia, Italy, Corsica/Sardinia, the Balearics, North Africa, Sicily). Every land region is a rectangle: the tileset has no concave-corner piece, and at 128 px the square notch of a stepped coast is obvious.
- Format: two ASCII layers of the same size, 16×9 cells of 128 px (arena 2048×1152). Tiles are drawn at the size of the retina art, so the map is at twice the scale of the ships. The full legend is in the map file header.
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
- **Shallows:** `TileMap.shallowAt` returns the translucent shallow-water tile (3×3 set: tiles 10–12, 26–28, 42–44) for every cell within one cell of land (8-neighbour), picked by which sides face open sea (`resolvePlainTile`, no mirroring). `TileMapView` draws this ring under the land at 0.9 alpha.
- Unused tiles:
  - The 2×2 dune (4/5/20/21) and the sand clearing in grass (36/37/52/53) were tried and removed, because their tone doesn't match the surrounding tiles and they showed as squares.
  - 68/69 (sand with pebbles) have no seamless pairing with the sand interior. Tiles 58/59 and 74/75 are empty in the sheet.
- Cells outside the grid repeat the nearest edge (`groundAt` and `shallowAt` accept any coordinate). Coastlines touching the arena border continue off-screen, and the renderer draws a 6-cell (768 px) margin so the scenery fills the letterbox. The tileset has no concave-corner pieces, so inner corners are square notches.
- Island collision: each corner cell uses the rounded outline of its own corner tile (`CORNER_OUTLINES` in `autotile.ts`, convex hulls measured from the alpha of the 64 px art, scaled to the tile size and mirrored like the tile), so a ship only hits where land is actually drawn. The rest of the land is decomposed greedily into maximal rectangles. Every piece is a convex polygon, ready for circle-vs-polygon. Rectangle sides facing water are inset by `COAST_INSET_PX` (4 px, the transparent bevel of the coast art). `ARENA_MAP` (`game/arena/index.ts`) is the resolved map consumed by rendering and, later, by collision and spawn systems.
- Dev aid: `?debugIslands` in the URL (dev only) outlines the collision polygons.

## 5. Rendering and resource management

- `game/assets/manifest.ts` defines the `PIXI.Assets` bundles (ships, effects, tiles, UI).
  - `loadGameAssets` reports progress, surfaces errors and supports retry before combat starts.
  - Everything loads at its real size (`resolution: 1`). Ships, parts and effects come from `png/default`: the loose PNGs in `png/retina` have the same pixel size (only the `*_retina` sheets are 2×), so loading them as 2× drew them at half size on high-DPR screens. Sharper ships on those screens would need the retina sheet.
  - Tiles are loaded as the individual `tile_N.png` files, not sliced from `tiles_sheet.png`. With the sheet, linear filtering at the fractional letterbox scale pulled pixels from neighbouring tiles and showed thin lines. Tiles use the `png/retina` files, which are 128 px, the size of a map cell.
- Bundles: `tiles` (tile_1–96), `ships` (`SHIP_SPRITES` and the cannon ball), `effects` (`explosion_1–3`, `fire_1–2`; `explosion_3` is the muzzle flash) and `hud` (the `enemy_health_*` bar sprites). Ship PNGs have the bow pointing down (+y); `ShipView` adds a −π/2 offset to the entity rotation (0 = +x).
- **Layers** (children of `PixiRenderer.world`, bottom to top): map → wakes → effects under → ship shadows → hulls → projectiles → effects over → health bars. Wakes and shadows are shared layers, so they stay below every hull.
- **Frame update:** `Game` keeps the frame time and, in the loop's `render(alpha)`, updates every view with it. Views do not subscribe to the ticker themselves, so pausing the loop freezes all of them.
- **`ShipView`** (visual only; collision uses the entity, not the sprite):
  - sea sway: one slow sine (0.55 Hz) rotates the hull ±0.025 rad and scales it ±1.5%, with a different phase per ship;
  - shadow: the same sprite, dark-tinted and offset by (7, 10) px at 0.22 alpha;
  - wake: two `MeshRope` bands of 16 points leaving the corners of the stern (the offsets follow the sprite scale). Each sample resets the oldest point to the stern and gives it an outward drift proportional to the speed; the alpha follows the speed;
  - recoil against a shot, decaying exponentially; a fade-in for newly spawned enemies;
  - damage stage: the hull sprite is picked from the ship's `sprites.stages` by remaining HP, and a red tint flashes on each hit;
  - health bar: the `enemy_health_frame` sprite plus a fill whose own texture frame is cropped to `hp / maxHp` (updated only when HP changes; red at 1/3 or less), drawn above the ship without rotating. The player's ship has one too;
  - sinking: at 0 HP the grey `sprites.destroyed` hull shrinks, lists, takes the water's tint and fades over 1.6 s, and the bar is hidden. `sunk` tells when it is over.
- **`EffectsView`**: pooled particle sprites (cap 700) in two layers, under and over the ships. Muzzle flash and smoke on `shotFired`, a ring and droplets when a projectile reaches its range, sand dust when it hits an island, a ripple on `enemySpawned`, foam behind every ship moving above 25 px/s, a flash and wood splinters on a hull hit, an explosion (`explosion_1`/`explosion_2`, dark smoke and water rings) on a destroyed ship, and smoke rising from damaged ships (light at 2/3 HP or less; dark with `fire_1`/`fire_2` flames at 1/3 or less). Its randomness uses `createRng` with a fixed seed, so screenshots are reproducible.
  - **Crew overboard:** when any ship is destroyed (enemy or player), 2 to 4 crew members (`crew_1–6`, `png/default/ship_parts`) jump off in different directions, shrink as they fall, float for a moment and fade as they sink, spinning slowly, with a small splash where each one lands. Each crew member is drawn twice: a black, semi-transparent copy a few pixels lower acts as its shadow.
- **`ProjectilesView`**: each projectile is a ball that grows up to 30% at mid-flight, a shadow that moves away with it (a fake arc) and a trail of up to 110 px (white for the player, peach for enemies).
- **Screen kick:** `PixiRenderer.kick` nudges the world container against the player's shot (1.5 px front, 3.5 px broadside), away from a hit the player takes (4 px) and when the player is destroyed (9 px), and lets it decay.
- `render/effects/fxTextures.ts` draws the effect textures (soft disc, ring, trail, wake) on canvases once per `Game`, and `Game.destroy()` destroys them after the scene.
- `prefers-reduced-motion` turns off the sway, the recoil and the screen kick, and reduces the sinking to a fade.
- Not implemented yet: floating texts.
- Textures are loaded once and reused. Projectile and effect views are pooled.
- Views (`ShipView`, `ProjectileView`, `HealthBarView`, `IslandView`) read from `World` every frame and own no gameplay state.
- Ship sprites degrade as HP drops (`ShipView`): each enemy kind and the player list their `sprites.stages` (intact → most damaged: red `ship_3/9/15`, yellow `ship_6/12/18`, blue `ship_5/11/17`, player `ship_2/8/14`), split evenly over `maxHp`, and a grey `sprites.destroyed` hull (`ship_21`/`ship_24`/`ship_23`, player `ship_20`) shown at 0 HP. `SHIP_SPRITES` is derived from these lists, so every stage is preloaded.
- `EnemiesView` keeps the view of a destroyed enemy after it left the `World`: it keeps syncing it from the last entity state (0 HP, stopped) until `sunk`, then destroys it.
- Viewport (`render/PixiRenderer.ts`): sets `resolution` and `autoDensity` from the DPR and fits the whole arena in the host (contain scale, centred), recomputed by a `ResizeObserver`. The letterbox area is filled by the map's off-arena margin (scenery only, not playable). `screenToArena` converts pointer coordinates to arena coordinates.
- `TileMapView` builds the map once: the water as a single `TilingSprite` of `tile_73` over the arena and its margin, then the shallows, then ground sprites with anchor 0.5, ±1 scale for mirroring and quarter-turn rotation, then the fort/decoration overlays. Only the water moves: its pattern drifts at (7, 3.5) px/s.
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
- Key bindings (`input/bindings.ts`, `KEY_BINDINGS`, by `KeyboardEvent.code`): `W`/`↑` forward, `A`/`←` rotate left, `D`/`→` rotate right. `Esc` pause (handled by `MatchScreen`, which reads the code from the same bindings). `Space` fire front, `Q` fire left broadside, `E` fire right broadside. `ACTION_BY_CODE` feeds `InputManager`, and the match screen renders the hint from the same list.
- `InputManager` listens on `window`, calls `preventDefault` only for bound keys, ignores keys typed in form fields, and clears all state on `blur` and when the tab is hidden.
- **Touch:** each on-screen button uses pointer events. `pointerdown` captures the pointer and calls `Game.setAction(action, true)` → `InputManager.setAction`; `pointerup`, `pointercancel` and `lostpointercapture` release it. One captured pointer per button gives multi-touch (move, turn and fire together). Presses are ignored while paused, like keys. `.game-canvas` has `touch-action: none`, so the browser does not zoom or scroll over the arena.
- **Mobile layout:** portrait and landscape both work with nothing clipped; landscape is recommended, because the arena is 16:9 and fills the screen there. The compact HUD and the 56 px controls apply under `(max-width: 600px), (max-height: 480px)`. A phone lying down (`max-height: 480px`) also gets thinner panel borders, a narrower modal, fixed-width menu buttons (the base width follows `vh`, which left no room for the text), Play and Options side by side, and 48 px controls. Modal panels are capped at the viewport height and scroll inside when the content is taller.

## 7. Local persistence

| Key | Content | Module |
| --- | --- | --- |
| options | session time, spawn interval (validated against `config/options.ts` limits) | `storage/optionsStorage.ts` |
| muted | global sound mute | `shared/audio/mute.ts` |
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
| Player max speed | 210 px/s | Crosses the 2048 px arena in about 10 s. Fast, arcade-style. |
| Acceleration / drag | 320 / 240 px/s² | About 0.66 s to reach full speed and about 0.9 s to stop. |
| Turn speed | 2.5 rad/s (constant) | Turn circle radius of about 84 px at full speed, under one 128 px tile, and the ship can turn in place. |
| Chaser speed / turn | 150 px/s, 2.0 rad/s | Slower than the player, so it can be outrun, but close enough to catch a player who turns a lot. |
| Shooter speed / turn | 125 px/s, 1.7 rad/s | The slowest turner: the player can sail out of its aim. |
| Shooter hold / attack range | 380 / 560 px | It stops well inside its range and keeps firing from a distance. |
| Shooter aim tolerance / cooldown | 0.14 rad / 2.2 s | It only fires when well aligned, and not often. |
| Enemy projectile | 520 px/s, range 620 px | Slower than the player's shots, so it can be dodged. |
| Spawn distance from player | 700 px | About 3 s of sailing away, so a new enemy is never an immediate hit. |
| Ship sprite scale | 1.35 | Player and medium enemies are drawn at 1.35× the source art; the Big Shooter at 1.2× that (1.62). Radius and hull length follow the scale. |
| Player collision radius | 34 px | About half the hull width of `ship_2` at 1.35×. It fits through one-tile (128 px) channels. |
| Hull half length | 67 px | Bow-to-centre distance at 1.35×, used for the island collision of bow and stern. |
| Front cannon | 0.45 s cooldown, 720 px/s, range 720 px | One fast, long shot, so it can fire often. |
| Broadside | 1.2 s cooldown (per side), 620 px/s, range 460 px | Each broadside fires 3 projectiles, so it reloads slower and reaches less than the front cannon. |
| Broadside shot spacing | 32 px | The 3 shots span 64 px, within the hull length. |
| Player HP / shot damage | 100 / 5.75 | 15% above the enemy shot (5). Front and broadside shots hurt the same; a full broadside (3 hits) is worth 17.25. |
| Chaser HP / ram damage | 30 / 10 | Dies to 6 shots (two broadsides). Ten rams sink the player, so it must be shot before it arrives. |
| Shooter HP / shot damage | 45 / 5 | 8 shots to destroy; 20 of its hits sink the player. |
| Big Shooter HP / shot damage | 55 / 4 | The toughest hull (10 shots) with the weakest shot. |

Option limits (`src/config/options.ts`):

| Option | Min | Max | Step | Default |
| --- | --- | --- | --- | --- |
| Game session time | 60 s | 180 s | 10 s | 120 s |
| Enemy spawn time | 1 s | 10 s | 1 s | 3 s |

Whole-second steps keep the number of distinct configurations small, so ranking groups stay populated.

## 12. Known limitations

**TBD**.

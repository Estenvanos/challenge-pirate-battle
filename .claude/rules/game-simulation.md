---
paths:
  - "src/game/core/**"
  - "src/game/simulation/**"
  - "src/game/physics/**"
  - "src/game/arena/**"
  - "src/config/**"
---

# Game simulation rules

## Purity
- No PixiJS, DOM, React or network code here. The simulation must run headless.
- Entities (`Player`, `Enemy`, `Projectile`) are plain data objects. No methods with side effects, no references to views.
- Systems are functions `(world, dt, config) => void` (or return events). One responsibility per system.

## Time
- `GameLoop` uses a **fixed timestep** with an accumulator; clamp the max frame delta (avoid the spiral of death after tab switches).
- Everything time-based (movement, rotation, cooldowns, projectile lifetime, spawn timer, match timer) uses the simulation `dt` from `GameClock` — never frame count, never wall clock.
- Randomness only from the seeded RNG in `core/random.ts`.

## System order (keep in sync with ARCHITECTURE.md)
input → AI (chaser, shooter) → movement → weapons → projectiles → collisions → damage → spawn → match (timer, score, end).

## Combat invariants
- Each projectile applies damage **once**, then is removed. Also remove it on obstacle hit, expiry (range/lifetime) or leaving the arena.
- Player projectiles only hit enemies; enemy projectiles only hit the player.
- Each weapon respects its own cooldown (front: 1 projectile; sides: 3 parallel projectiles, left and right).
- Destroyed entities are skipped by every system: no damage, no shooting, no collision.
- Chaser explodes on impact with the player and damages them; this self-destruction gives **no points**. Enemies destroyed by player attacks give **1 point**.
- Ships (player and enemies) cannot leave the arena or cross islands. Islands also block projectiles.

## Spawns
- Spawn every configured interval until the match ends; both Chaser and Shooter must appear in a default match (distribution from config).
- Spawn points must be free of obstacles and at least a configured minimum distance from the player.

## Match lifecycle
- Ends when time runs out or player HP reaches 0. Ending stops movement, attacks, damage, spawns and scoring.
- Restart builds a fresh `World` (HP, score, timer, entities reset) — never mutate the old one back.
- Pause freezes clock, cooldowns and simulation; on resume, clear queued input so nothing accumulates from the paused period.

## Config
- All numbers come from `gameConfig.ts` (typed, `as const`/readonly). Changing balance must never require editing a system.
- `optionsLimits.ts` documents min/max for session time (60–180 s) and spawn interval (positive, documented bounds).

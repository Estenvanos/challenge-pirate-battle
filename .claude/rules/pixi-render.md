---
paths:
  - "src/game/render/**"
  - "src/game/assets/**"
  - "src/game/audio/**"
---

# PixiJS rendering, assets and audio rules

## PixiJS v8 API
- `const app = new Application(); await app.init({...})` — never the v7 constructor options.
- Use `Container`, `Sprite`, `Graphics` (v8 chained API: `.rect().fill()`), `Assets` bundles. No `DisplayObject`, no `Loader`.

## Views read, never own
- Views (`ShipView`, `ProjectileView`, `HealthBarView`, `IslandView`) mirror `World` state each render. They hold no gameplay state and never mutate the simulation.
- Map entities to views by id; create/remove views when entities appear/disappear.
- **Pool** frequently created objects (projectiles, effects). Do not create `Sprite`/`Graphics` per frame.
- Health bars above every ship; ship damage appearance changes with remaining HP (asset variants).
- Effects (muzzle flash, explosion, smoke) are visual only and must not hide arena readability.

## Textures and assets
- `manifest.ts` declares bundles; `loadGameAssets.ts` loads them once, reports progress, surfaces errors and supports retry **before** combat starts.
- Reuse textures from `Assets.get`; never `Texture.from(url)` in hot paths.
- Retina variants exist in `public/assets/png/retina` and `*_retina` sheets — pick by DPR.

## Viewport
- Handle `resolution`/`autoDensity` with devicePixelRatio, keep the arena aspect ratio (letterbox), and expose a function mapping screen/pointer coordinates to arena coordinates.
- Resizing changes only presentation, never game rules or arena size.

## Destroy
- `destroy()` order: stop ticker → remove listeners (resize, etc.) → destroy stage children (`{ children: true }`) → `app.destroy()`. Do not destroy shared cached textures unless unloading the bundle on purpose.
- Must be callable twice safely and before `init` finished (Strict Mode).

## Audio
- `SoundManager` preloads, respects user gesture for autoplay, stops loops on pause/destroy.

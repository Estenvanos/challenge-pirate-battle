# Performance profile

Target: **60 FPS** during combat in an optimized build (`proposta.md` §9). Raw data: [`results.json`](results.json). Reproduce with `npm run profile`.

## Reference environment

| Item     | Value                                                                               |
| -------- | ----------------------------------------------------------------------------------- |
| CPU      | Intel Core i5-10210U @ 1.60 GHz, 4 cores / 8 threads                                |
| GPU      | Intel UHD Graphics (Comet Lake GT2), Mesa driver (via ANGLE, OpenGL ES 3.2)         |
| RAM      | 7.4 GB                                                                              |
| OS       | Fedora Linux, kernel 7.2.7                                                          |
| Browser  | Chromium 153.0.8010.12 (Playwright build), headless with GPU (`--use-angle=gl-egl`) |
| Viewport | 1280 × 720, device pixel ratio 1                                                    |
| Build    | `vite build` (production) + `vite preview`                                          |
| Match    | 180 s session, 3 s spawn interval, seed 3                                           |

## Method

`scripts/profile.mjs`:

1. Builds the app for production into `dist-profile/`, with `VITE_GAME_TEST=true` so the read-only hooks (`window.__GAME_TEST__.state()`) exist. `?clock=real` keeps the real clock: the loop runs from the Pixi ticker exactly as in the published build.
2. Serves it with `vite preview` and opens headless Chromium on the real GPU.
3. Plays a full 3-minute match. A pilot running inside the page presses the real keys (`KeyboardEvent` on `window`): it turns to the nearest enemy and fires the front cannon or a broadside. It records every `requestAnimationFrame` interval and, once per second, the number of enemies and projectiles.
4. **Worst case:** the pilot alone dies after about 40 s against a 3 s spawn rate. For this run only, it restores the player's health every frame (`restorePlayerHealth()`, a profiling-only hook), so the match reaches 180 s and enemies keep piling up. Damage, hits and effects still happen.
5. Memory: 5 cycles of _Play → 20 s of combat → Pause → Main Menu_. After each cycle it forces garbage collection twice (`HeapProfiler.collectGarbage`) and reads `Performance.getMetrics` (JS heap, DOM nodes, event listeners), plus the number of `<canvas>` elements.

## Results: 3-minute match

| Metric                     | Value                    |
| -------------------------- | ------------------------ |
| Duration                   | 180 s (ended by time)    |
| Frames                     | 10 867                   |
| Average FPS                | **60.0**                 |
| Frame time, median         | 16.7 ms                  |
| Frame time, **p95**        | **16.7 ms**              |
| Frame time, p99            | 16.8 ms                  |
| Frame time, max            | 100 ms (1 frame > 20 ms) |
| Enemies, average / maximum | 21.9 / **44**            |
| Projectiles, avg / max     | 3.2 / 9                  |

Entities over time (enemies / projectiles in flight):

| t (s)       | 0   | 20  | 40  | 60  | 81  | 101 | 121 | 141 | 161 |
| ----------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Enemies     | 0   | 4   | 9   | 13  | 18  | 25  | 31  | 36  | 40  |
| Projectiles | 0   | 2   | 5   | 2   | 5   | 4   | 3   | 6   | 5   |

The frame rate stays at the display rate for the whole match, including the last minute with 40+ ships, their wakes, smoke and health bars. The single long frame (100 ms) is a one-off stall, not a trend.

## Results: memory over 5 cycles

| After cycle | JS heap (MB) | DOM nodes | Listeners | Canvases |
| ----------- | ------------ | --------- | --------- | -------- |
| 0 (menu)    | 4.94         | 196       | 181       | 0        |
| 1           | 8.88         | 226       | 202       | 0        |
| 2           | 9.21         | 226       | 202       | 0        |
| 3           | 9.42         | 226       | 202       | 0        |
| 4           | 9.55         | 226       | 202       | 0        |
| 5           | 9.74         | 226       | 202       | 0        |

- The first match adds about 4 MB: textures, the loaded modules, the shared sounds and the query cache. They are loaded once and reused.
- After that, DOM nodes, event listeners and canvases stay flat: every `Game` releases its ticker, listeners, views and WebGL context when the player leaves.
- The heap still grows by about 0.15–0.3 MB per cycle. We investigated this by diffing heap snapshots after cycle 3 and cycle 9:
  - **Fixed:** every match created 14 new `Audio` elements for the game sounds. Each one was downloaded again through the MSW service worker, and each request left `MessageEvent`s, streams and timing entries behind. The originals are now loaded once per page and shared (`SoundManager`), which cut the requests from about 14 per cycle to about 3.
  - **Remaining, not ours:** V8 compiled code and feedback vectors (JIT warm-up); Pixi's global shader-program cache, which stores the sources of each new `Application` under new names (about 5 KB per match); the `<img>` requests of the menu and HUD passing through the service worker; and the network data that DevTools keeps because Playwright has the protocol attached. None of these hold game objects, textures or views.

## Limitations

- **Headless timing:** `requestAnimationFrame` is paced at 60 Hz by headless Chromium, so 60 FPS is also the ceiling. The numbers show that every frame fits in the budget; they do not show headroom above 60.
- **Audio off:** the run uses muted audio. Sound clones are HTML `<audio>` elements and do not affect rendering.
- **One machine:** a laptop with an integrated GPU. Weaker phones were only checked by hand, not profiled.
- **The pilot is not a player:** it does not dodge, so enemies bunch around it. That is a heavier scene than a human usually sees.

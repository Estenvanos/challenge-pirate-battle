// Profiling do combate em build otimizado (proposta §9).
//
// 1. Gera um build de produção com os ganchos de leitura (VITE_GAME_TEST) em dist-profile/.
// 2. Serve com `vite preview` e abre o Chromium headless na GPU (ANGLE/EGL).
// 3. Partida de 3 min (180 s / spawn 3 s) com relógio real: um piloto na página
//    aperta as teclas de verdade (KeyboardEvent) e mede cada quadro.
// 4. Memória: 5 ciclos de iniciar, jogar 20 s e sair, com GC forçado entre eles.
//
// Uso: npm run profile  → docs/profiling/results.json
import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";

const PORT = 4174;
const URL_BASE = `http://localhost:${PORT}`;
const OUT_DIR = "dist-profile";
const MATCH = { sessionTimeSec: 180, spawnIntervalSec: 3 };
const SEED = 3;
const VIEWPORT = { width: 1280, height: 720 };
const CYCLES = Number(process.env.PROFILE_CYCLES) || 5;
const CYCLE_PLAY_MS = Number(process.env.PROFILE_CYCLE_MS) || 20_000;
const GPU_ARGS = [
  "--enable-gpu",
  "--ignore-gpu-blocklist",
  "--use-gl=angle",
  "--use-angle=gl-egl",
];

function build() {
  const result = spawnSync(
    "npx",
    ["vite", "build", "--outDir", OUT_DIR, "--emptyOutDir"],
    {
      stdio: "inherit",
      env: { ...process.env, VITE_GAME_TEST: "true" },
    },
  );
  if (result.status !== 0) throw new Error("build failed");
}

async function startPreview() {
  const server = spawn(
    "npx",
    [
      "vite",
      "preview",
      "--outDir",
      OUT_DIR,
      "--port",
      String(PORT),
      "--strictPort",
    ],
    {
      stdio: "ignore",
    },
  );
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(URL_BASE)).ok) return server;
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  server.kill();
  throw new Error("preview did not start");
}

async function openApp(browser) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  await context.addInitScript((options) => {
    if (sessionStorage.getItem("profile-seeded")) return;
    sessionStorage.setItem("profile-seeded", "1");
    const put = (key, data) =>
      localStorage.setItem(
        `pirate-battle:${key}`,
        JSON.stringify({ v: 1, data }),
      );
    put("options", options);
    put("muted", true);
    put("playerName", "Profiler");
  }, MATCH);
  const page = await context.newPage();
  await page.goto(`${URL_BASE}/?seed=${SEED}&clock=real`);
  await page.getByRole("heading", { name: "Pirate Battle" }).waitFor();
  return { context, page };
}

async function play(page) {
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(() => window.__GAME_TEST__?.ready() === true);
}

/** Piloto na página: mira no inimigo mais próximo e atira; mede cada quadro. */
function installPilot() {
  const held = new Set();
  const key = (code, down) => {
    if (down === held.has(code)) return;
    if (down) held.add(code);
    else held.delete(code);
    window.dispatchEvent(
      new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }),
    );
  };
  const delta = (a, b) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d <= -Math.PI) d += Math.PI * 2;
    return d;
  };
  const stats = { frames: [], samples: [], startedAt: performance.now() };
  let last = performance.now();
  let lastSample = 0;
  const tick = (now) => {
    stats.frames.push(now - last);
    last = now;
    const state = window.__GAME_TEST__?.state();
    if (state && !state.endReason) {
      // Pior caso: o jogador não afunda e os inimigos se acumulam até o fim.
      if (window.__keepAlive) window.__GAME_TEST__.restorePlayerHealth();
      if (now - lastSample >= 1000) {
        lastSample = now;
        stats.samples.push({
          t: Math.round((now - stats.startedAt) / 1000),
          enemies: state.enemies.length,
          projectiles: state.projectiles.length,
          hp: state.player.hp,
          score: state.score,
        });
      }
      const { player } = state;
      const target = [...state.enemies].sort(
        (a, b) =>
          Math.hypot(a.x - player.x, a.y - player.y) -
          Math.hypot(b.x - player.x, b.y - player.y),
      )[0];
      if (target) {
        const bearing = delta(
          player.rotation,
          Math.atan2(target.y - player.y, target.x - player.x),
        );
        const abeam = Math.abs(Math.abs(bearing) - Math.PI / 2) < 0.15;
        key("Space", Math.abs(bearing) < 0.1);
        key("KeyE", abeam && bearing > 0);
        key("KeyQ", abeam && bearing < 0);
        const aim = Math.abs(bearing) <= Math.PI / 2 ? bearing : 0;
        key("KeyD", aim > 0.08);
        key("KeyA", aim < -0.08);
      }
    }
    stats.running = state && !state.endReason;
    if (!window.__stopPilot) requestAnimationFrame(tick);
  };
  window.__pilotStats = stats;
  requestAnimationFrame(tick);
}

function summarize(frames, durationMs) {
  const sorted = [...frames].sort((a, b) => a - b);
  const pct = (p) =>
    sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  return {
    durationSec: +(durationMs / 1000).toFixed(1),
    frames: frames.length,
    avgFps: +((frames.length / durationMs) * 1000).toFixed(1),
    frameTimeMs: {
      median: +pct(50).toFixed(2),
      p95: +pct(95).toFixed(2),
      p99: +pct(99).toFixed(2),
      max: +sorted[sorted.length - 1].toFixed(2),
    },
    framesOver20ms: frames.filter((f) => f > 20).length,
  };
}

async function profileMatch(browser) {
  const { context, page } = await openApp(browser);
  await play(page);
  await page.evaluate(() => (window.__keepAlive = true));
  await page.evaluate(installPilot);
  const dialog = page.getByRole("dialog", {
    name: /Battle Complete|Game Over/,
  });
  await dialog.waitFor({ timeout: (MATCH.sessionTimeSec + 30) * 1000 });
  await page.evaluate(() => (window.__stopPilot = true));
  const stats = await page.evaluate(() => {
    const s = window.__pilotStats;
    return {
      frames: s.frames.slice(1),
      samples: s.samples,
      durationMs: performance.now() - s.startedAt,
    };
  });
  const end = await page.evaluate(() => window.__GAME_TEST__.state());
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
  });
  await context.close();
  const enemies = stats.samples.map((s) => s.enemies);
  const projectiles = stats.samples.map((s) => s.projectiles);
  return {
    renderer,
    endReason: end.endReason,
    elapsedSec: +end.elapsedSec.toFixed(1),
    score: end.score,
    ...summarize(stats.frames, stats.durationMs),
    entities: {
      maxEnemies: Math.max(...enemies),
      avgEnemies: +(
        enemies.reduce((a, b) => a + b, 0) / enemies.length
      ).toFixed(1),
      maxProjectiles: Math.max(...projectiles),
      avgProjectiles: +(
        projectiles.reduce((a, b) => a + b, 0) / projectiles.length
      ).toFixed(1),
    },
    samples: stats.samples,
  };
}

async function metrics(page, cdp) {
  await cdp.send("HeapProfiler.collectGarbage");
  await cdp.send("HeapProfiler.collectGarbage");
  const { metrics: list } = await cdp.send("Performance.getMetrics");
  const get = (name) => list.find((m) => m.name === name)?.value ?? 0;
  return {
    jsHeapUsedMB: +(get("JSHeapUsedSize") / 1024 / 1024).toFixed(2),
    domNodes: get("Nodes"),
    listeners: get("JSEventListeners"),
    canvases: await page.locator("canvas").count(),
  };
}

async function profileMemory(browser) {
  const { context, page } = await openApp(browser);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  const cycles = [{ cycle: 0, ...(await metrics(page, cdp)) }];
  for (let cycle = 1; cycle <= CYCLES; cycle++) {
    await play(page);
    await page.evaluate(installPilot);
    await page.waitForTimeout(CYCLE_PLAY_MS);
    await page.evaluate(() => (window.__stopPilot = true));
    await page.getByRole("button", { name: "Pause" }).click();
    await page.getByRole("button", { name: "Main Menu" }).click();
    await page.getByRole("heading", { name: "Pirate Battle" }).waitFor();
    await page.evaluate(() => (window.__stopPilot = false));
    cycles.push({ cycle, ...(await metrics(page, cdp)) });
  }
  await context.close();
  return cycles;
}

build();
const server = await startPreview();
try {
  const browser = await chromium.launch({ headless: true, args: GPU_ARGS });
  const environment = {
    date: new Date().toISOString(),
    cpu: os.cpus()[0].model,
    cores: os.cpus().length,
    memoryGB: +(os.totalmem() / 1024 ** 3).toFixed(1),
    os: `${os.type()} ${os.release()}`,
    browser: `Chromium ${browser.version()} (headless, ANGLE GL-EGL)`,
    viewport: `${VIEWPORT.width}x${VIEWPORT.height} @1x`,
    match: { ...MATCH, seed: SEED },
  };
  // PROFILE_MEMORY_ONLY=1 pula a partida (investigar a memória com mais ciclos).
  const memoryOnly = Boolean(process.env.PROFILE_MEMORY_ONLY);
  let match = null;
  if (!memoryOnly) {
    console.log("Profiling a 3-minute match…");
    match = await profileMatch(browser);
    console.log(
      `  ${match.avgFps} FPS, p95 ${match.frameTimeMs.p95} ms, ${match.endReason} at ${match.elapsedSec}s, max ${match.entities.maxEnemies} enemies`,
    );
  }
  console.log(`Profiling memory over ${CYCLES} cycles…`);
  const memory = await profileMemory(browser);
  for (const c of memory)
    console.log(
      `  cycle ${c.cycle}: ${c.jsHeapUsedMB} MB, ${c.domNodes} nodes, ${c.listeners} listeners`,
    );
  await browser.close();
  if (memoryOnly) process.exit(0);
  mkdirSync("docs/profiling", { recursive: true });
  writeFileSync(
    "docs/profiling/results.json",
    JSON.stringify({ environment, match, memory }, null, 2) + "\n",
  );
  console.log("Wrote docs/profiling/results.json");
} finally {
  server.kill();
}

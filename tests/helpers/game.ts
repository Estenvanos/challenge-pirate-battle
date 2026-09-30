import { expect, type Locator, type Page } from "@playwright/test";
import type { GameTestState } from "../../src/testing/testHooks";

export interface AppSetup {
  /** Cenário do MSW (?scenario=). */
  scenario?: string;
  /** Seed da partida (?seed=). */
  seed?: number;
  options?: { sessionTimeSec: number; spawnIntervalSec: number };
  /** null = sem nome salvo (Play abre o diálogo). */
  playerName?: string | null;
  /** Registros pendentes já salvos antes de abrir o app. */
  pending?: unknown[];
}

const NS = "pirate-battle:";
/** Partida curta e sem inimigos nos primeiros 10 s. */
export const QUIET_OPTIONS = { sessionTimeSec: 60, spawnIntervalSec: 10 };
export const STEP_SEC = 1 / 60;

/** Seeds medidas com QUIET_OPTIONS (ver ARCHITECTURE.md §10). */
export const SEEDS = {
  /** Lutando com fight(), chega ao fim dos 60 s com folga de vida. */
  survivor: 3,
  /** O primeiro inimigo (aos 10 s) é um Shooter; parado, morre em ~41 s. */
  shooterFirst: 1,
  /** Com spawn de 2 s: um Chaser e logo depois Shooters. */
  mixed: 7,
} as const;

export class GamePage {
  constructor(
    readonly page: Page,
    private readonly setup: AppSetup,
  ) {}

  /** Abre o app com o storage semeado só no primeiro carregamento (refresh preserva o estado). */
  async open(overrides: AppSetup = {}): Promise<void> {
    const setup = { ...this.setup, ...overrides };
    const seed = {
      [`${NS}options`]: setup.options ?? QUIET_OPTIONS,
      [`${NS}muted`]: true,
      ...(setup.playerName !== null && {
        [`${NS}playerName`]: setup.playerName ?? "Tester",
      }),
      ...(setup.pending && { [`${NS}pendingSubmissions`]: setup.pending }),
    };
    await this.page.addInitScript((entries) => {
      if (sessionStorage.getItem("e2e-seeded")) return;
      sessionStorage.setItem("e2e-seeded", "1");
      for (const [key, data] of Object.entries(entries)) {
        localStorage.setItem(key, JSON.stringify({ v: 1, data }));
      }
    }, seed);
    const params = new URLSearchParams({
      scenario: setup.scenario ?? "success",
      seed: String(setup.seed ?? 1),
    });
    await this.page.goto(`/?${params}`);
    await expect(this.menuTitle).toBeVisible();
  }

  get menuTitle(): Locator {
    return this.page.getByRole("heading", { name: "Pirate Battle" });
  }

  button(name: string | RegExp): Locator {
    return this.page.getByRole("button", {
      name,
      exact: typeof name === "string",
    });
  }

  /** Play → espera a arena carregar e os ganchos da partida ficarem prontos. */
  async play(): Promise<void> {
    await this.button("Play").click();
    await this.waitForArena();
  }

  async waitForArena(): Promise<void> {
    await this.page.waitForFunction(
      () => window.__GAME_TEST__?.ready() === true,
    );
  }

  /** Depois de Play Again: espera a partida nova (relógio zerado). */
  async waitForNewMatch(): Promise<void> {
    await this.page.waitForFunction(
      () => window.__GAME_TEST__?.state()?.elapsedSec === 0,
    );
  }

  async state(): Promise<GameTestState> {
    const state = await this.page.evaluate(() => window.__GAME_TEST__!.state());
    if (!state) throw new Error("No match running");
    return state;
  }

  /** Avança o relógio da partida (passos fixos reais da simulação). */
  async advance(sec: number): Promise<void> {
    await this.page.evaluate((s) => window.__GAME_TEST__!.advance(s), sec);
  }

  /** Segura uma tecla do jogo por `sec` de jogo. */
  async hold(key: string, sec: number): Promise<void> {
    await this.page.keyboard.down(key);
    await this.advance(sec);
    await this.page.keyboard.up(key);
  }

  /** Um toque de tecla que dura um passo da simulação. */
  async tap(key: string): Promise<void> {
    await this.hold(key, STEP_SEC);
  }

  /** Vira a proa até `angle` (rad) com A/D. */
  async turnTo(angle: number, tolerance = 0.05): Promise<void> {
    for (let i = 0; i < 40; i++) {
      const { player } = await this.state();
      const error = angleDelta(player.rotation, angle);
      if (Math.abs(error) <= tolerance) return;
      await this.hold(
        error > 0 ? "d" : "a",
        Math.min(Math.abs(error) / 2.5, 0.25),
      );
    }
    throw new Error(`Could not turn to ${angle}`);
  }

  /** Avança até `predicate` valer, em fatias de `stepSec` (máx. `maxSec`). */
  async advanceUntil(
    predicate: (state: GameTestState) => boolean,
    { maxSec = 60, stepSec = 0.25 } = {},
  ): Promise<GameTestState> {
    for (let t = 0; t <= maxSec; t += stepSec) {
      const state = await this.state();
      if (predicate(state)) return state;
      await this.advance(stepSec);
    }
    throw new Error(`Condition not met within ${maxSec}s of game time`);
  }

  /**
   * Combate com os controles reais (A/D para mirar, Espaço/Q/E para atirar)
   * contra o inimigo mais próximo, até `until` valer ou `maxSec` de jogo.
   */
  async fight(
    until: (state: GameTestState) => boolean,
    { maxSec = 60 } = {},
  ): Promise<GameTestState> {
    const start = (await this.state()).elapsedSec;
    for (;;) {
      const state = await this.state();
      if (until(state) || state.endReason) return state;
      if (state.elapsedSec - start > maxSec) {
        throw new Error(`fight(): condition not met within ${maxSec}s`);
      }
      const { player } = state;
      const target = [...state.enemies].sort(
        (a, b) => distance(player, a) - distance(player, b),
      )[0];
      if (!target) {
        await this.advance(0.25);
        continue;
      }
      const bearing = angleDelta(
        player.rotation,
        Math.atan2(target.y - player.y, target.x - player.x),
      );
      // Bordada se o alvo está de través; senão, proa nele.
      const abeam = Math.abs(Math.abs(bearing) - Math.PI / 2) < 0.12;
      if (abeam) {
        await this.tap(bearing > 0 ? "e" : "q");
      } else if (Math.abs(bearing) < 0.08) {
        await this.tap("Space");
      }
      const aim = Math.abs(bearing) <= Math.PI / 2 ? bearing : 0;
      if (Math.abs(aim) >= 0.08) {
        await this.hold(
          aim > 0 ? "d" : "a",
          Math.min(Math.abs(aim) / 2.5, 0.15),
        );
      } else {
        await this.advance(0.1);
      }
    }
  }

  /**
   * Termina a partida pelo tempo, lutando para sobreviver (use SEEDS.survivor),
   * e espera o resultado.
   */
  async finishByTime(): Promise<void> {
    const session = (this.setup.options ?? QUIET_OPTIONS).sessionTimeSec;
    const state = await this.fight((s) => s.elapsedSec >= session, {
      maxSec: session + 5,
    });
    if (state.endReason !== "timeUp") {
      throw new Error(`Expected timeUp, got ${state.endReason}`);
    }
    // O resultado aparece 1 s depois do fim, para a explosão ser vista.
    await this.advance(1.5);
    await expect(this.resultDialog).toBeVisible();
  }

  /** Fica parado até ser destruído e espera o resultado. */
  async finishByDeath(): Promise<void> {
    await this.advanceUntil((s) => s.endReason !== null, {
      maxSec: 60,
      stepSec: 1,
    });
    await this.advance(1.5);
    await expect(this.resultDialog).toBeVisible();
  }

  get resultDialog(): Locator {
    return this.page.getByRole("dialog", { name: /Battle Complete|Game Over/ });
  }

  async openLog(tab: "Ranking" | "Match History"): Promise<void> {
    await this.button(tab).click();
    await expect(this.page.getByRole("tab", { name: tab })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }
}

/** Menor diferença de a até b (rad), em (-π, π]. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

export function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Registro de partida válido, para semear pendentes. */
export function matchRecord(matchId: string, score = 3) {
  return {
    matchId,
    playerId: "local-player",
    playerName: "Tester",
    date: "2026-09-30T12:00:00.000Z",
    score,
    durationSec: 60,
    endReason: "timeUp",
    config: QUIET_OPTIONS,
  };
}

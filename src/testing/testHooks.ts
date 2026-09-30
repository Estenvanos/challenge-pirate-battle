import type { Game } from "../game/core/Game";
import { circleVsPolygon } from "../game/physics/collision";

/**
 * Ganchos do Playwright em `window.__GAME_TEST__`. Só existem com
 * VITE_GAME_TEST=true (servidor dos testes); o build publicado não os tem.
 */
export const TEST_MODE = import.meta.env.VITE_GAME_TEST === "true";

/**
 * Relógio manual nos testes; `?clock=real` mantém o tempo real (profiling
 * com os ganchos de leitura).
 */
export function testManualClock(): boolean {
  if (!TEST_MODE) return false;
  return new URLSearchParams(window.location.search).get("clock") !== "real";
}

/** Seed da partida vinda de `?seed=N` (só em modo de teste). */
export function testSeed(): number | undefined {
  if (!TEST_MODE) return undefined;
  const raw = new URLSearchParams(window.location.search).get("seed");
  return raw === null ? undefined : Number(raw);
}

export interface GameTestState {
  player: ShipState;
  enemies: (ShipState & { id: string; kind: string })[];
  projectiles: { owner: "player" | "enemy"; x: number; y: number }[];
  cooldowns: { front: number; left: number; right: number };
  score: number;
  elapsedSec: number;
  endReason: string | null;
  arena: { width: number; height: number };
  /** O círculo do jogador invade alguma ilha (nunca deveria). */
  playerOnIsland: boolean;
}

interface ShipState {
  x: number;
  y: number;
  rotation: number;
  speed: number;
  hp: number;
  maxHp: number;
}

export interface GameTestApi {
  /** Há uma partida carregada. */
  ready(): boolean;
  /** Avança `sec` de jogo ativo em passos fixos (ignorado na pausa). */
  advance(sec: number): void;
  state(): GameTestState | null;
  /**
   * Só para o profiling: devolve a vida cheia ao jogador, para a partida de
   * 3 min chegar ao fim com a arena cheia (pior caso). Os testes não usam.
   */
  restorePlayerHealth(): void;
}

declare global {
  interface Window {
    __GAME_TEST__?: GameTestApi;
  }
}

function ship({ x, y, rotation, speed, hp, maxHp }: ShipState): ShipState {
  return { x, y, rotation, speed, hp, maxHp };
}

/** Liga os ganchos à partida atual (`null` ao desmontar). */
export function exposeGameForTests(game: Game | null): void {
  if (!TEST_MODE) return;
  window.__GAME_TEST__ = {
    ready: () => game?.state != null,
    advance: (sec) => game?.advance(sec),
    restorePlayerHealth: () => {
      const player = game?.state?.player;
      if (player && player.hp > 0) player.hp = player.maxHp;
    },
    state: () => {
      const world = game?.state;
      if (!world) return null;
      const { player } = world;
      return {
        player: ship(player),
        enemies: world.enemies.map((enemy) => ({
          ...ship(enemy),
          id: enemy.id,
          kind: enemy.kind,
        })),
        projectiles: world.projectiles.map(({ owner, x, y }) => ({
          owner,
          x,
          y,
        })),
        cooldowns: { ...world.playerCooldowns },
        score: world.score,
        elapsedSec: world.elapsedSec,
        endReason: world.endReason,
        arena: { ...world.arena },
        playerOnIsland: world.islands.some(
          (island) => circleVsPolygon(player, player.radius, island) !== null,
        ),
      };
    },
  };
}

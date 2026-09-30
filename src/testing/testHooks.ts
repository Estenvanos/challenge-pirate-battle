import type { Game } from "../game/core/Game";
import { circleVsPolygon } from "../game/physics/collision";

/** Read-only game hooks exist only in Playwright's test build. */
export const TEST_MODE = import.meta.env.VITE_GAME_TEST === "true";

export function testManualClock(): boolean {
  if (!TEST_MODE) return false;
  return new URLSearchParams(window.location.search).get("clock") !== "real";
}

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
  ready(): boolean;
  advance(sec: number): void;
  state(): GameTestState | null;
  /** Profiling only: keep a three-minute stress match alive. */
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

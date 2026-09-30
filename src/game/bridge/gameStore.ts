import { GAME_CONFIG } from "../../config/gameConfig";

// React subscribes to discrete HUD changes, never to the render loop.
export interface GameSnapshot {
  readonly hp: number;
  readonly maxHp: number;
  readonly score: number;
  readonly timeLeftSec: number | null;
}

const INITIAL: GameSnapshot = Object.freeze({
  hp: GAME_CONFIG.player.maxHp,
  maxHp: GAME_CONFIG.player.maxHp,
  score: 0,
  timeLeftSec: null,
});

let snapshot = INITIAL;
const listeners = new Set<() => void>();

function publish(next: GameSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export const gameStore = {
  getSnapshot: () => snapshot,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  setPlayerHealth: (hp: number, maxHp: number) =>
    publish({ ...snapshot, hp, maxHp }),
  setScore: (score: number) => publish({ ...snapshot, score }),
  setTimeLeft: (timeLeftSec: number) => publish({ ...snapshot, timeLeftSec }),
  reset: () => publish(INITIAL),
};

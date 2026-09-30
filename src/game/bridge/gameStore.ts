// Snapshot do estado do jogo para a UI (React lê via useGameSnapshot).
// Tudo aqui muda em momentos pontuais (dano, ponto, virada de segundo), então
// o React nunca re-renderiza por quadro.
import { GAME_CONFIG } from "../../config/gameConfig";

export interface GameSnapshot {
  readonly hp: number;
  readonly maxHp: number;
  readonly score: number;
  /** Segundos inteiros restantes; `null` até a partida começar. */
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
  /** Volta ao estado de partida nova (ao sair da partida). */
  reset: () => publish(INITIAL),
};

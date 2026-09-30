import { useSyncExternalStore } from "react";
import { gameStore, type GameSnapshot } from "./gameStore";

/** Estado do jogo para o HUD; re-renderiza só quando o snapshot muda. */
export const useGameSnapshot = (): GameSnapshot =>
  useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot);

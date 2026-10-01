import { useSyncExternalStore } from "react";
import { gameStore, type GameSnapshot } from "../game/bridge/gameStore";

export const useGameSnapshot = (): GameSnapshot =>
  useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot);

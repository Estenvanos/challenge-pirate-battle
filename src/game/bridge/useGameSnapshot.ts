import { useSyncExternalStore } from "react";
import { gameStore, type GameSnapshot } from "./gameStore";

export const useGameSnapshot = (): GameSnapshot =>
  useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot);

import { isPlayerName } from "../config/player";
import { readStore, writeStore } from "./localStore";

const KEY = "playerName";
const VERSION = 1;

function isStoredName(value: unknown): value is string | null {
  return value === null || isPlayerName(value);
}

/** null enquanto o jogador ainda não escolheu um nome. */
export function readPlayerName(): string | null {
  return readStore(KEY, VERSION, isStoredName, null);
}

export function writePlayerName(name: string): boolean {
  return writeStore(KEY, VERSION, name);
}

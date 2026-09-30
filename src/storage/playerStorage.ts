import { STORAGE_KEYS } from "../constants/storage";
import { playerNameSchema } from "../schemas/player";
import { readStore, writeStore } from "./localStore";

/** null enquanto o jogador ainda não escolheu um nome. */
export function readPlayerName(): string | null {
  return readStore(STORAGE_KEYS.playerName, playerNameSchema.nullable(), null);
}

export function writePlayerName(name: string): boolean {
  return writeStore(STORAGE_KEYS.playerName, name);
}

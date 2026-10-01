import { STORAGE_KEYS } from "../constants/storage";
import { playerNameSchema } from "../schemas/player";
import { readStore, writeStore } from "./localStore";

export function readPlayerName(): string | null {
  return readStore(STORAGE_KEYS.playerName, playerNameSchema.nullable(), null);
}

export function writePlayerName(name: string): boolean {
  return writeStore(STORAGE_KEYS.playerName, name);
}

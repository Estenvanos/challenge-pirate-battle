import { DEFAULT_OPTIONS, type GameOptions } from "../config/options";
import { STORAGE_KEYS } from "../constants/storage";
import { gameOptionsSchema } from "../schemas/options";
import { readStore, writeStore } from "./localStore";

export function readOptions(): GameOptions {
  return readStore(STORAGE_KEYS.options, gameOptionsSchema, {
    ...DEFAULT_OPTIONS,
  });
}

export function writeOptions(options: GameOptions): boolean {
  return writeStore(STORAGE_KEYS.options, options);
}

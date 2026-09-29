import {
  DEFAULT_OPTIONS,
  isGameOptions,
  type GameOptions,
} from "../config/options";
import { readStore, writeStore } from "./localStore";

const KEY = "options";
const VERSION = 1;

export function readOptions(): GameOptions {
  return readStore(KEY, VERSION, isGameOptions, { ...DEFAULT_OPTIONS });
}

export function writeOptions(options: GameOptions): boolean {
  return writeStore(KEY, VERSION, options);
}

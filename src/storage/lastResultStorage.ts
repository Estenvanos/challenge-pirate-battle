import { isMatchRecord, type MatchRecord } from "../api/contracts";
import { readStore, removeStore, writeStore } from "./localStore";

// Último resultado concluído, mostrado no menu mesmo depois de um refresh.
const KEY = "lastResult";
const VERSION = 1;

function isStoredResult(value: unknown): value is MatchRecord | null {
  return value === null || isMatchRecord(value);
}

export function readLastResult(): MatchRecord | null {
  return readStore(KEY, VERSION, isStoredResult, null);
}

export function writeLastResult(record: MatchRecord): boolean {
  return writeStore(KEY, VERSION, record);
}

export function clearLastResult(): void {
  removeStore(KEY);
}

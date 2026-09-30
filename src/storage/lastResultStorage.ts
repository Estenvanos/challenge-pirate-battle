import { STORAGE_KEYS } from "../constants/storage";
import { matchRecordSchema, type MatchRecord } from "../schemas/match";
import { readStore, removeStore, writeStore } from "./localStore";

export function readLastResult(): MatchRecord | null {
  return readStore(STORAGE_KEYS.lastResult, matchRecordSchema.nullable(), null);
}

export function writeLastResult(record: MatchRecord): boolean {
  return writeStore(STORAGE_KEYS.lastResult, record);
}

export function clearLastResult(): void {
  removeStore(STORAGE_KEYS.lastResult);
}

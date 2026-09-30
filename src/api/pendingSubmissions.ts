import { z } from "zod";
import { STORAGE_KEYS } from "../constants/storage";
import { matchRecordSchema, type MatchRecord } from "../schemas/match";
import { readStore, removeStore, writeStore } from "../storage/localStore";

const STORE = STORAGE_KEYS.pendingSubmissions;

// Validate entries separately so one corrupt record cannot discard the queue.
let pending: MatchRecord[] = readStore(STORE, z.array(z.unknown()), []).flatMap(
  (item) => {
    const result = matchRecordSchema.safeParse(item);
    return result.success ? [result.data] : [];
  },
);
const listeners = new Set<() => void>();

function save(next: MatchRecord[]): void {
  pending = next;
  writeStore(STORE, next);
  for (const listener of listeners) listener();
}

/** Stable reference until the queue changes, for useSyncExternalStore. */
export function readPendingSubmissions(): readonly MatchRecord[] {
  return pending;
}

/** Queue before sending; each matchId appears at most once. */
export function addPendingSubmission(record: MatchRecord): void {
  if (pending.some((item) => item.matchId === record.matchId)) return;
  save([...pending, record]);
}

export function removePendingSubmission(matchId: string): void {
  if (!pending.some((item) => item.matchId === matchId)) return;
  save(pending.filter((item) => item.matchId !== matchId));
}

export function subscribePendingSubmissions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearPendingSubmissions(): void {
  removeStore(STORE);
  pending = [];
  for (const listener of listeners) listener();
}

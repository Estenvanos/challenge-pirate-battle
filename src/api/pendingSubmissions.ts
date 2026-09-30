import { z } from "zod";
import { STORAGE_KEYS } from "../constants/storage";
import { matchRecordSchema, type MatchRecord } from "../schemas/match";
import { readStore, removeStore, writeStore } from "../storage/localStore";

// Fila de registros ainda não confirmados pela API: sobrevive a falhas e ao refresh.
const STORE = STORAGE_KEYS.pendingSubmissions;

// Um item corrompido é descartado sozinho; os válidos continuam na fila.
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

/** Referência estável enquanto a fila não muda (serve ao useSyncExternalStore). */
export function readPendingSubmissions(): readonly MatchRecord[] {
  return pending;
}

/** Enfileira antes de enviar; o mesmo matchId nunca entra duas vezes. */
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

/** Esvazia a fila (reset dos mocks). */
export function clearPendingSubmissions(): void {
  removeStore(STORE);
  pending = [];
  for (const listener of listeners) listener();
}

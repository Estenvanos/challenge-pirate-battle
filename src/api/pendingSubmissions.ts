import { readStore, removeStore, writeStore } from "../storage/localStore";
import { isMatchRecord, type MatchRecord } from "./contracts";

// Fila de registros ainda não confirmados pela API: sobrevive a falhas e ao refresh.
const KEY = "pendingSubmissions";
const VERSION = 1;

function isList(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

// Um item corrompido é descartado sozinho; os válidos continuam na fila.
let pending = readStore(KEY, VERSION, isList, []).filter(isMatchRecord);
const listeners = new Set<() => void>();

function save(next: MatchRecord[]): void {
  pending = next;
  writeStore(KEY, VERSION, next);
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
  removeStore(KEY);
  pending = [];
  for (const listener of listeners) listener();
}

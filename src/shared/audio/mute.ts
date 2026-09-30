import { readStore, writeStore } from "../../storage/localStore";

// Mudo global de todos os sons (ambiente, interface e partida), salvo no localStorage.
const KEY = "muted";
const VERSION = 1;

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

let muted = readStore(KEY, VERSION, isBoolean, false);
const listeners = new Set<() => void>();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  writeStore(KEY, VERSION, next);
  for (const listener of listeners) listener();
}

export function subscribeMuted(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

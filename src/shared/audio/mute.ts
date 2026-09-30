import { z } from "zod";
import { STORAGE_KEYS } from "../../constants/storage";
import { readStore, writeStore } from "../../storage/localStore";

// Mudo global de todos os sons (ambiente, interface e partida), salvo no localStorage.
let muted = readStore(STORAGE_KEYS.muted, z.boolean(), false);
const listeners = new Set<() => void>();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  writeStore(STORAGE_KEYS.muted, next);
  for (const listener of listeners) listener();
}

export function subscribeMuted(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

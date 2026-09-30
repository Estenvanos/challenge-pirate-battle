import { z } from "zod";
import { STORAGE_NAMESPACE, type StorageEntry } from "../constants/storage";

const envelopeSchema = z.object({ v: z.number(), data: z.unknown() });

export function readStore<T>(
  { key, version }: StorageEntry,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  try {
    const raw = localStorage.getItem(STORAGE_NAMESPACE + key);
    if (raw === null) return fallback;
    const envelope = envelopeSchema.safeParse(JSON.parse(raw));
    if (!envelope.success || envelope.data.v !== version) return fallback;
    const result = schema.safeParse(envelope.data.data);
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore<T>(
  { key, version }: StorageEntry,
  data: T,
): boolean {
  try {
    localStorage.setItem(
      STORAGE_NAMESPACE + key,
      JSON.stringify({ v: version, data }),
    );
    return true;
  } catch {
    return false;
  }
}

export function removeStore({ key }: StorageEntry): void {
  try {
    localStorage.removeItem(STORAGE_NAMESPACE + key);
  } catch {
    // Storage unavailable: nothing to remove.
  }
}

const NAMESPACE = "pirate-battle:";

interface Envelope {
  v: number;
  data: unknown;
}

function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Envelope).v === "number" &&
    "data" in value
  );
}

export function readStore<T>(
  key: string,
  version: number,
  validate: (data: unknown) => data is T,
  fallback: T,
): T {
  try {
    const raw = localStorage.getItem(NAMESPACE + key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!isEnvelope(parsed) || parsed.v !== version) return fallback;
    return validate(parsed.data) ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore<T>(key: string, version: number, data: T): boolean {
  try {
    const envelope: Envelope = { v: version, data };
    localStorage.setItem(NAMESPACE + key, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function removeStore(key: string): void {
  try {
    localStorage.removeItem(NAMESPACE + key);
  } catch {
    // Storage unavailable: nothing to remove.
  }
}

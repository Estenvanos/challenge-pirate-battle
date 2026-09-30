// Chaves do localStorage num só lugar: evita colisão e deixa a versão de cada formato à vista.
// Mudou o formato salvo? Suba a `version`: o dado antigo é ignorado e volta ao padrão.

export const STORAGE_NAMESPACE = "pirate-battle:";

export interface StorageEntry {
  readonly key: string;
  readonly version: number;
}

export const STORAGE_KEYS = Object.freeze({
  options: { key: "options", version: 1 },
  playerName: { key: "playerName", version: 1 },
  lastResult: { key: "lastResult", version: 1 },
  pendingSubmissions: { key: "pendingSubmissions", version: 1 },
  muted: { key: "muted", version: 1 },
  mockDb: { key: "mockDb", version: 1 },
  scenario: { key: "scenario", version: 1 },
} as const satisfies Record<string, StorageEntry>);

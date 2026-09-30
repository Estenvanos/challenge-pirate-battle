export const LOCAL_PLAYER_ID = "local-player";

export const PLAYER_NAME_LIMITS = Object.freeze({ min: 2, max: 16 });

export function normalizePlayerName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

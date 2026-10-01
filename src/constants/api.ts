export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const API_ROUTES = Object.freeze({
  ranking: "/ranking",
  matches: "/matches",
  match: (matchId: string) => `/matches/${encodeURIComponent(matchId)}`,
  matchPattern: "/matches/:matchId",
});

export const REQUEST_TIMEOUT_MS =
  Number(import.meta.env.VITE_API_TIMEOUT_MS) > 0
    ? Number(import.meta.env.VITE_API_TIMEOUT_MS)
    : 8000;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export const QUERY_DEFAULTS = Object.freeze({
  staleTimeMs: 30_000,
  maxRetries: 3,
  retryBaseDelayMs: 500,
  retryMaxDelayMs: 8000,
});

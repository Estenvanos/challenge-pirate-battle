// Rotas e tempos da API, compartilhados pelo cliente Axios e pelos handlers do MSW.

export const API_BASE_URL = "/api";

/** Caminhos relativos a `API_BASE_URL`. */
export const API_ROUTES = Object.freeze({
  ranking: "/ranking",
  matches: "/matches",
  match: (matchId: string) => `/matches/${encodeURIComponent(matchId)}`,
  /** Padrão de rota do MSW para `match`. */
  matchPattern: "/matches/:matchId",
});

export const REQUEST_TIMEOUT_MS = 8000;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export const QUERY_DEFAULTS = Object.freeze({
  staleTimeMs: 30_000,
  maxRetries: 3,
  retryBaseDelayMs: 500,
  retryMaxDelayMs: 8000,
});

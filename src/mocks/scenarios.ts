import { delay, HttpResponse } from "msw";
import { z } from "zod";
import { STORAGE_KEYS } from "../constants/storage";
import type { ApiError } from "../schemas/match";
import { createRng } from "../game/core/random";
import { readStore, removeStore, writeStore } from "../storage/localStore";

export const SCENARIOS = {
  success: "Success",
  empty: "Empty lists",
  manyPages: "Many pages",
  slow: "Slow (2.5 s)",
  variableLatency: "Variable latency",
  outOfOrder: "Out-of-order responses",
  timeout: "Timeout",
  networkError: "Network error",
  clientError: "HTTP 400",
  serverError: "HTTP 500",
  rankingDown: "Ranking read fails",
  historyDown: "History read fails",
  timeoutAfterWrite: "Timeout after saving a match",
  downAtMatchEnd: "API down when saving a match",
} as const;

export type ScenarioId = keyof typeof SCENARIOS;
export type Endpoint = "ranking" | "history" | "submit";

const STORE = STORAGE_KEYS.scenario;
const URL_PARAM = "scenario";

const SLOW_MS = 2500;
const VARIABLE_MS = { min: 200, max: 2000 } as const;
const OUT_OF_ORDER_MS = { slow: 2500, fast: 300 } as const;
// Keep variable delays reproducible across page loads and tests.
const LATENCY_SEED = 1;

const scenarioIdSchema = z.enum(
  Object.keys(SCENARIOS) as [ScenarioId, ...ScenarioId[]],
);

function initialScenario(): ScenarioId {
  // The URL takes precedence and persists the scenario selected by tests.
  const fromUrl = scenarioIdSchema.safeParse(
    new URLSearchParams(window.location.search).get(URL_PARAM),
  );
  if (fromUrl.success) {
    writeStore(STORE, fromUrl.data);
    return fromUrl.data;
  }
  return readStore(STORE, scenarioIdSchema, "success");
}

const scenario = initialScenario();
const rng = createRng(LATENCY_SEED);
let requestCount = 0;
const hungWrites = new Set<string>();

export function getScenario(): ScenarioId {
  return scenario;
}

export function selectScenario(id: ScenarioId): void {
  writeStore(STORE, id);
  reloadWithoutScenarioParam();
}

export function resetScenario(): void {
  removeStore(STORE);
  reloadWithoutScenarioParam();
}

function reloadWithoutScenarioParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(URL_PARAM);
  window.location.replace(url);
}

function apiError(status: number, code: string, message: string) {
  return HttpResponse.json<ApiError>({ code, message }, { status });
}

/** Delays or fails one request; undefined lets the handler answer normally. */
export async function simulateNetwork(
  endpoint: Endpoint,
): Promise<Response | undefined> {
  switch (scenario) {
    case "slow":
      await delay(SLOW_MS);
      return;
    case "variableLatency":
      await delay(
        VARIABLE_MS.min + rng.next() * (VARIABLE_MS.max - VARIABLE_MS.min),
      );
      return;
    case "outOfOrder":
      await delay(
        requestCount++ % 2 === 0 ? OUT_OF_ORDER_MS.slow : OUT_OF_ORDER_MS.fast,
      );
      return;
    case "timeout":
      await delay("infinite");
      return;
    case "networkError":
      return HttpResponse.error();
    case "clientError":
      return apiError(400, "SIMULATED_BAD_REQUEST", "Simulated 400 response.");
    case "serverError":
      return apiError(500, "SIMULATED_SERVER_ERROR", "Simulated 500 response.");
    case "rankingDown":
      return endpoint === "ranking" ? unavailable() : undefined;
    case "historyDown":
      return endpoint === "history" ? unavailable() : undefined;
    case "downAtMatchEnd":
      return endpoint === "submit" ? unavailable() : undefined;
    default:
      return;
  }
}

function unavailable() {
  return apiError(503, "SIMULATED_UNAVAILABLE", "Service unavailable.");
}

/** Simulates one lost response after a successful write for each match. */
export function hangsAfterWrite(matchId: string): boolean {
  if (scenario !== "timeoutAfterWrite" || hungWrites.has(matchId)) return false;
  hungWrites.add(matchId);
  return true;
}

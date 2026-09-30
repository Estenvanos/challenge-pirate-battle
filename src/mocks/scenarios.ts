import { delay, HttpResponse } from "msw";
import type { ApiError } from "../api/contracts";
import { createRng } from "../game/core/random";
import { readStore, removeStore, writeStore } from "../storage/localStore";

// Cenários de rede do MSW: escolhidos no ScenarioPanel ou por ?scenario=<id> na URL.
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

const KEY = "scenario";
const VERSION = 1;
const URL_PARAM = "scenario";

const SLOW_MS = 2500;
const VARIABLE_MS = { min: 200, max: 2000 } as const;
/** Pedidos alternam entre lento e rápido: o segundo chega antes do primeiro. */
const OUT_OF_ORDER_MS = { slow: 2500, fast: 300 } as const;
/** Seed fixa: a mesma sequência de latências a cada carregamento da página. */
const LATENCY_SEED = 1;

function isScenarioId(value: unknown): value is ScenarioId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(SCENARIOS, value)
  );
}

function initialScenario(): ScenarioId {
  // A URL vence e fica salva: os testes do Playwright escolhem o cenário assim.
  const fromUrl = new URLSearchParams(window.location.search).get(URL_PARAM);
  if (isScenarioId(fromUrl)) {
    writeStore(KEY, VERSION, fromUrl);
    return fromUrl;
  }
  return readStore(KEY, VERSION, isScenarioId, "success");
}

const scenario = initialScenario();
const rng = createRng(LATENCY_SEED);
let requestCount = 0;
/** Partidas cuja escrita já travou uma vez no timeoutAfterWrite. */
const hungWrites = new Set<string>();

export function getScenario(): ScenarioId {
  return scenario;
}

/** Salva o cenário e recarrega: cache, latências e pendentes recomeçam limpos. */
export function selectScenario(id: ScenarioId): void {
  writeStore(KEY, VERSION, id);
  reloadWithoutScenarioParam();
}

/** Volta ao cenário de sucesso e recarrega. */
export function resetScenario(): void {
  removeStore(KEY);
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

/**
 * Aplica o cenário a um pedido: atrasa, ou devolve a falha simulada.
 * undefined = o handler segue e responde normalmente.
 */
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
      // O Axios desiste pelo próprio timeout.
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

/** timeoutAfterWrite: a primeira escrita de cada partida grava e nunca responde. */
export function hangsAfterWrite(matchId: string): boolean {
  if (scenario !== "timeoutAfterWrite" || hungWrites.has(matchId)) return false;
  hungWrites.add(matchId);
  return true;
}

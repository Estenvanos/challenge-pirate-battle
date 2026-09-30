import { http, HttpResponse, type PathParams } from "msw";
import type { ApiError, Page, RankingEntry } from "../../api/contracts";
import { queryRanking } from "../mockDb";
import { paginate, parsePageParams } from "../pagination";
import { simulateNetwork } from "../scenarios";
import { badRequest } from "./errors";

function parsePositiveNumber(raw: string | null): number | null {
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export const rankingHandlers = [
  http.get<PathParams, never, Page<RankingEntry> | ApiError>(
    "/api/ranking",
    async ({ request }) => {
      const simulated = await simulateNetwork("ranking");
      if (simulated) return simulated;

      const params = new URL(request.url).searchParams;

      const pageParams = parsePageParams(params);
      if (!pageParams) return badRequest("Invalid page or pageSize.");

      const sessionTimeSec = parsePositiveNumber(params.get("sessionTime"));
      const spawnIntervalSec = parsePositiveNumber(params.get("spawnInterval"));
      if (sessionTimeSec === null || spawnIntervalSec === null) {
        return badRequest("sessionTime and spawnInterval are required.");
      }

      const entries = queryRanking({ sessionTimeSec, spawnIntervalSec });
      return HttpResponse.json<Page<RankingEntry>>(
        paginate(entries, pageParams),
      );
    },
  ),
];

import { http, HttpResponse, type PathParams } from "msw";
import { API_BASE_URL, API_ROUTES } from "../../constants/api";
import type { ApiError, Page, RankingEntry } from "../../schemas/match";
import { pageParamsSchema, rankingQuerySchema } from "../../schemas/query";
import { queryRanking } from "../mockDb";
import { paginate } from "../pagination";
import { simulateNetwork } from "../scenarios";
import { badRequest } from "./errors";

export const rankingHandlers = [
  http.get<PathParams, never, Page<RankingEntry> | ApiError>(
    API_BASE_URL + API_ROUTES.ranking,
    async ({ request }) => {
      const simulated = await simulateNetwork("ranking");
      if (simulated) return simulated;

      const params = Object.fromEntries(new URL(request.url).searchParams);

      const pageParams = pageParamsSchema.safeParse(params);
      if (!pageParams.success) return badRequest("Invalid page or pageSize.");

      const query = rankingQuerySchema.safeParse(params);
      if (!query.success) {
        return badRequest("sessionTime and spawnInterval are required.");
      }

      const entries = queryRanking({
        sessionTimeSec: query.data.sessionTime,
        spawnIntervalSec: query.data.spawnInterval,
      });
      return HttpResponse.json<Page<RankingEntry>>(
        paginate(entries, pageParams.data),
      );
    },
  ),
];

import { delay, http, HttpResponse, type PathParams } from "msw";
import { API_BASE_URL, API_ROUTES } from "../../constants/api";
import {
  matchRecordSchema,
  type ApiError,
  type MatchRecord,
  type Page,
  type SubmitMatchResponse,
} from "../../schemas/match";
import { pageParamsSchema } from "../../schemas/query";
import { queryMatches, upsertMatch } from "../mockDb";
import { paginate } from "../pagination";
import { hangsAfterWrite, simulateNetwork } from "../scenarios";
import { badRequest } from "./errors";

export const historyHandlers = [
  http.get<PathParams, never, Page<MatchRecord> | ApiError>(
    API_BASE_URL + API_ROUTES.matches,
    async ({ request }) => {
      const simulated = await simulateNetwork("history");
      if (simulated) return simulated;

      const params = new URL(request.url).searchParams;

      const pageParams = pageParamsSchema.safeParse(Object.fromEntries(params));
      if (!pageParams.success) return badRequest("Invalid page or pageSize.");

      const playerId = params.get("playerId");
      if (!playerId) return badRequest("playerId is required.");

      return HttpResponse.json<Page<MatchRecord>>(
        paginate(queryMatches(playerId), pageParams.data),
      );
    },
  ),

  http.put<{ matchId: string }, never, SubmitMatchResponse | ApiError>(
    API_BASE_URL + API_ROUTES.matchPattern,
    async ({ request, params }) => {
      const simulated = await simulateNetwork("submit");
      if (simulated) return simulated;

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return badRequest("Body must be valid JSON.");
      }

      const parsed = matchRecordSchema.safeParse(body);
      if (!parsed.success) return badRequest("Invalid match record.");
      const record = parsed.data;
      if (record.matchId !== params.matchId) {
        return badRequest("matchId in the URL and body must match.");
      }

      const result = upsertMatch(record);
      // Gravou, mas a resposta se perde: o reenvio deve achar o registro existente.
      if (hangsAfterWrite(record.matchId)) await delay("infinite");
      return HttpResponse.json<SubmitMatchResponse>(result, {
        status: result.created ? 201 : 200,
      });
    },
  ),
];

import { http, HttpResponse, type PathParams } from "msw";
import {
  isMatchRecord,
  type ApiError,
  type MatchRecord,
  type Page,
  type SubmitMatchResponse,
} from "../../api/contracts";
import { queryMatches, upsertMatch } from "../mockDb";
import { paginate, parsePageParams } from "../pagination";
import { badRequest } from "./errors";

export const historyHandlers = [
  http.get<PathParams, never, Page<MatchRecord> | ApiError>(
    "/api/matches",
    ({ request }) => {
      const params = new URL(request.url).searchParams;

      const pageParams = parsePageParams(params);
      if (!pageParams) return badRequest("Invalid page or pageSize.");

      const playerId = params.get("playerId");
      if (!playerId) return badRequest("playerId is required.");

      return HttpResponse.json<Page<MatchRecord>>(
        paginate(queryMatches(playerId), pageParams),
      );
    },
  ),

  http.put<{ matchId: string }, never, SubmitMatchResponse | ApiError>(
    "/api/matches/:matchId",
    async ({ request, params }) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return badRequest("Body must be valid JSON.");
      }

      if (!isMatchRecord(body)) return badRequest("Invalid match record.");
      if (body.matchId !== params.matchId) {
        return badRequest("matchId in the URL and body must match.");
      }

      const result = upsertMatch(body);
      return HttpResponse.json<SubmitMatchResponse>(result, {
        status: result.created ? 201 : 200,
      });
    },
  ),
];

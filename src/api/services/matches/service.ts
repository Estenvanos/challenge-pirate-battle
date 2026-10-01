import { API_ROUTES } from "../../../constants/api";
import {
  matchRecordSchema,
  pageSchema,
  submitMatchResponseSchema,
  type MatchRecord,
  type Page,
  type SubmitMatchResponse,
} from "../../../schemas/match";
import { httpClient } from "../../httpClient";

export interface MatchHistoryParams {
  playerId: string;
  page: number;
  pageSize: number;
}

const matchPageSchema = pageSchema(matchRecordSchema);

export async function getMatchHistory(
  { playerId, page, pageSize }: MatchHistoryParams,
  signal?: AbortSignal,
): Promise<Page<MatchRecord>> {
  const { data } = await httpClient.get<unknown>(API_ROUTES.matches, {
    params: { playerId, page, pageSize },
    signal,
  });
  return matchPageSchema.parse(data);
}

export async function submitMatch(
  record: MatchRecord,
): Promise<SubmitMatchResponse> {
  const { data } = await httpClient.put<unknown>(
    API_ROUTES.match(record.matchId),
    record,
  );
  return submitMatchResponseSchema.parse(data);
}

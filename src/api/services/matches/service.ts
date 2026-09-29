import type { MatchRecord, Page, SubmitMatchResponse } from "../../contracts";
import { httpClient } from "../../httpClient";

export interface MatchHistoryParams {
  playerId: string;
  page: number;
  pageSize: number;
}

export async function getMatchHistory(
  { playerId, page, pageSize }: MatchHistoryParams,
  signal?: AbortSignal,
): Promise<Page<MatchRecord>> {
  const { data } = await httpClient.get<Page<MatchRecord>>("/matches", {
    params: { playerId, page, pageSize },
    signal,
  });
  return data;
}

/** Upsert idempotente: reenviar o mesmo matchId retorna o registro existente. */
export async function submitMatch(
  record: MatchRecord,
): Promise<SubmitMatchResponse> {
  const { data } = await httpClient.put<SubmitMatchResponse>(
    `/matches/${encodeURIComponent(record.matchId)}`,
    record,
  );
  return data;
}

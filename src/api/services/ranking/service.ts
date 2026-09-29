import type { MatchConfig, Page, RankingEntry } from "../../contracts";
import { httpClient } from "../../httpClient";

export interface RankingParams {
  config: MatchConfig;
  page: number;
  pageSize: number;
}

export async function getRanking(
  { config, page, pageSize }: RankingParams,
  signal?: AbortSignal,
): Promise<Page<RankingEntry>> {
  const { data } = await httpClient.get<Page<RankingEntry>>("/ranking", {
    params: {
      sessionTime: config.sessionTimeSec,
      spawnInterval: config.spawnIntervalSec,
      page,
      pageSize,
    },
    signal,
  });
  return data;
}

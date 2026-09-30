import { API_ROUTES } from "../../../constants/api";
import {
  pageSchema,
  rankingEntrySchema,
  type MatchConfig,
  type Page,
  type RankingEntry,
} from "../../../schemas/match";
import { httpClient } from "../../httpClient";

export interface RankingParams {
  config: MatchConfig;
  page: number;
  pageSize: number;
}

const rankingPageSchema = pageSchema(rankingEntrySchema);

export async function getRanking(
  { config, page, pageSize }: RankingParams,
  signal?: AbortSignal,
): Promise<Page<RankingEntry>> {
  const { data } = await httpClient.get<unknown>(API_ROUTES.ranking, {
    params: {
      sessionTime: config.sessionTimeSec,
      spawnInterval: config.spawnIntervalSec,
      page,
      pageSize,
    },
    signal,
  });
  return rankingPageSchema.parse(data);
}

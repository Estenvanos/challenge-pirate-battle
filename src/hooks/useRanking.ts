import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { rankingQueries } from "../api/services/ranking/queries";
import type { RankingParams } from "../api/services/ranking/service";

export function useRanking(params: RankingParams) {
  return useQuery({
    ...rankingQueries.list(params),
    placeholderData: keepPreviousData,
  });
}

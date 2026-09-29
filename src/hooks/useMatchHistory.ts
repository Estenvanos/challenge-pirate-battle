import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { matchesQueries } from "../api/services/matches/queries";
import type { MatchHistoryParams } from "../api/services/matches/service";

export function useMatchHistory(params: MatchHistoryParams) {
  return useQuery({
    ...matchesQueries.history(params),
    placeholderData: keepPreviousData,
  });
}

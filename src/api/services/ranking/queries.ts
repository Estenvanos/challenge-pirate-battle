import { queryOptions } from "@tanstack/react-query";
import { getRanking, type RankingParams } from "./service";

export const rankingKeys = {
  all: ["ranking"] as const,
  list: ({ config, page, pageSize }: RankingParams) =>
    [
      ...rankingKeys.all,
      "list",
      config.sessionTimeSec,
      config.spawnIntervalSec,
      page,
      pageSize,
    ] as const,
};

export const rankingQueries = {
  list: (params: RankingParams) =>
    queryOptions({
      queryKey: rankingKeys.list(params),
      queryFn: ({ signal }) => getRanking(params, signal),
    }),
};

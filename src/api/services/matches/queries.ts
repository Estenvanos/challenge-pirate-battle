import { mutationOptions, queryOptions } from "@tanstack/react-query";
import {
  getMatchHistory,
  submitMatch,
  type MatchHistoryParams,
} from "./service";

export const matchesKeys = {
  all: ["matches"] as const,
  history: ({ playerId, page, pageSize }: MatchHistoryParams) =>
    [...matchesKeys.all, "history", playerId, page, pageSize] as const,
  submit: () => [...matchesKeys.all, "submit"] as const,
};

export const matchesQueries = {
  history: (params: MatchHistoryParams) =>
    queryOptions({
      queryKey: matchesKeys.history(params),
      queryFn: ({ signal }) => getMatchHistory(params, signal),
    }),
};

export const matchesMutations = {
  submit: () =>
    mutationOptions({
      mutationKey: matchesKeys.submit(),
      mutationFn: submitMatch,
    }),
};

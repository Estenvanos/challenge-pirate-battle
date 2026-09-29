import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchesKeys, matchesMutations } from "../api/services/matches/queries";
import { rankingKeys } from "../api/services/ranking/queries";

export function useSubmitMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    ...matchesMutations.submit(),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: rankingKeys.all }),
        queryClient.invalidateQueries({ queryKey: matchesKeys.all }),
      ]),
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addPendingSubmission,
  removePendingSubmission,
} from "../api/pendingSubmissions";
import { matchesKeys, matchesMutations } from "../api/services/matches/queries";
import { rankingKeys } from "../api/services/ranking/queries";

export function useSubmitMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    ...matchesMutations.submit(),
    // Persist before sending; remove only after server confirmation.
    onMutate: (record) => addPendingSubmission(record),
    onSuccess: (_data, record) => {
      removePendingSubmission(record.matchId);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: rankingKeys.all }),
        queryClient.invalidateQueries({ queryKey: matchesKeys.all }),
      ]);
    },
  });
}

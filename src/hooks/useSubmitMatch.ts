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
    // Na fila antes de enviar; só sai quando a API confirma.
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

import { useIsMutating } from "@tanstack/react-query";
import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  readPendingSubmissions,
  subscribePendingSubmissions,
} from "../api/pendingSubmissions";
import { matchesKeys } from "../api/services/matches/queries";
import { useSubmitMatch } from "./useSubmitMatch";

/** Registros ainda não confirmados e o reenvio de todos eles (PUT idempotente). */
export function usePendingSubmissions() {
  const pending = useSyncExternalStore(
    subscribePendingSubmissions,
    readPendingSubmissions,
  );
  const saving = useIsMutating({ mutationKey: matchesKeys.submit() }) > 0;
  const { mutate } = useSubmitMatch();

  function resend() {
    for (const record of readPendingSubmissions()) mutate(record);
  }

  return { pending, saving, resend };
}

/** Reenvia a fila uma vez por carregamento da página (recuperação após refresh). */
export function useResendPendingOnStart() {
  const { mutate } = useSubmitMatch();
  const sent = useRef(false);

  useEffect(() => {
    // Sincroniza a fila salva no localStorage com a API. O ref segura a segunda
    // execução do Strict Mode; não há o que desfazer, o PUT é idempotente.
    if (sent.current) return;
    sent.current = true;
    for (const record of readPendingSubmissions()) mutate(record);
  }, [mutate]);
}

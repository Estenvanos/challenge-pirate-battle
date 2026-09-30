import { useIsMutating } from "@tanstack/react-query";
import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  readPendingSubmissions,
  subscribePendingSubmissions,
} from "../api/pendingSubmissions";
import { matchesKeys } from "../api/services/matches/queries";
import { useSubmitMatch } from "./useSubmitMatch";

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

export function useResendPendingOnStart() {
  const { mutate } = useSubmitMatch();
  const sent = useRef(false);

  useEffect(() => {
    // Strict Mode may run this effect twice; PUT remains idempotent on retries.
    if (sent.current) return;
    sent.current = true;
    for (const record of readPendingSubmissions()) mutate(record);
  }, [mutate]);
}

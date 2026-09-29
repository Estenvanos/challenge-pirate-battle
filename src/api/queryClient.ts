import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 8000;
const STALE_TIME_MS = 30_000;

function isClientError(error: unknown): boolean {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return status !== undefined && status >= 400 && status < 500;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) =>
          !isClientError(error) && failureCount < MAX_RETRIES,
        retryDelay: (attempt) =>
          Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS),
      },
    },
  });
}

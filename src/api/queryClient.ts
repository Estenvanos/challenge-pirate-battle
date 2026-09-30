import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ZodError } from "zod";
import { QUERY_DEFAULTS } from "../constants/api";

/** 4xx and invalid schemas cannot recover through automatic retries. */
function isPermanentError(error: unknown): boolean {
  if (error instanceof ZodError) return true;
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return status !== undefined && status >= 400 && status < 500;
}

export function createQueryClient(): QueryClient {
  const { staleTimeMs, maxRetries, retryBaseDelayMs, retryMaxDelayMs } =
    QUERY_DEFAULTS;
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: staleTimeMs,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) =>
          !isPermanentError(error) && failureCount < maxRetries,
        retryDelay: (attempt) =>
          Math.min(retryBaseDelayMs * 2 ** attempt, retryMaxDelayMs),
      },
    },
  });
}

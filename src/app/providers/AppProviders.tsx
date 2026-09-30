import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createQueryClient } from "../../api/queryClient";
import { PauseProvider } from "../../features/match/PauseProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <PauseProvider>{children}</PauseProvider>
    </QueryClientProvider>
  );
}

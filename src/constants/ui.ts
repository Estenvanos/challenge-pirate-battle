import type { EndReason } from "../schemas/match";

export const END_REASON_LABELS: Readonly<Record<EndReason, string>> = {
  timeUp: "Time up",
  playerDestroyed: "Defeated",
};

export const RESULT_TITLES: Readonly<Record<EndReason, string>> = {
  timeUp: "Battle Complete",
  playerDestroyed: "Game Over",
};

export type LogTab = "ranking" | "history";

export const LOG_TABS: readonly { id: LogTab; label: string }[] = [
  { id: "ranking", label: "Ranking" },
  { id: "history", label: "Match History" },
];

export const LOG_PAGE_SIZE = 5;

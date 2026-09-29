import { historyHandlers } from "./history";
import { rankingHandlers } from "./ranking";

export const handlers = [...rankingHandlers, ...historyHandlers];

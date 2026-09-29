// Contracts shared by the HTTP client and the MSW handlers.

export type EndReason = "timeUp" | "playerDestroyed";

export interface MatchConfig {
  sessionTimeSec: number;
  spawnIntervalSec: number;
}

export interface MatchRecord {
  matchId: string;
  playerId: string;
  playerName: string;
  /** ISO 8601 date of when the match ended. */
  date: string;
  score: number;
  /** Effective (active, unpaused) duration in seconds. */
  durationSec: number;
  endReason: EndReason;
  config: MatchConfig;
}

export interface RankingEntry {
  /** 1-based position across all pages. */
  position: number;
  matchId: string;
  playerId: string;
  playerName: string;
  score: number;
  durationSec: number;
  date: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface SubmitMatchResponse {
  record: MatchRecord;
  /** false when the match was already recorded (idempotent resubmit). */
  created: boolean;
}

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

const END_REASONS: readonly EndReason[] = ["timeUp", "playerDestroyed"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function isMatchConfig(value: unknown): value is MatchConfig {
  return (
    isRecord(value) &&
    isNonNegativeNumber(value.sessionTimeSec) &&
    isNonNegativeNumber(value.spawnIntervalSec)
  );
}

export function isMatchRecord(value: unknown): value is MatchRecord {
  return (
    isRecord(value) &&
    isNonEmptyString(value.matchId) &&
    isNonEmptyString(value.playerId) &&
    isNonEmptyString(value.playerName) &&
    isNonEmptyString(value.date) &&
    !Number.isNaN(Date.parse(value.date)) &&
    isNonNegativeNumber(value.score) &&
    Number.isInteger(value.score) &&
    isNonNegativeNumber(value.durationSec) &&
    END_REASONS.includes(value.endReason as EndReason) &&
    isMatchConfig(value.config)
  );
}

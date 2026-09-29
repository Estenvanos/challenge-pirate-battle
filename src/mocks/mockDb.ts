import {
  isMatchRecord,
  type MatchConfig,
  type MatchRecord,
  type RankingEntry,
} from "../api/contracts";
import { readStore, removeStore, writeStore } from "../storage/localStore";
import { fixtureMatches } from "./fixtures/matches";

const STORE_KEY = "mockDb";
const STORE_VERSION = 1;

function isMatchRecordList(value: unknown): value is MatchRecord[] {
  return Array.isArray(value) && value.every(isMatchRecord);
}

function loadConfirmed(): MatchRecord[] {
  return readStore(STORE_KEY, STORE_VERSION, isMatchRecordList, []);
}

function allMatches(): MatchRecord[] {
  return [...fixtureMatches, ...loadConfirmed()];
}

function sameConfig(a: MatchConfig, b: MatchConfig): boolean {
  return (
    a.sessionTimeSec === b.sessionTimeSec &&
    a.spawnIntervalSec === b.spawnIntervalSec
  );
}

function compareRanking(a: MatchRecord, b: MatchRecord): number {
  return (
    b.score - a.score ||
    a.durationSec - b.durationSec ||
    Date.parse(a.date) - Date.parse(b.date) ||
    a.matchId.localeCompare(b.matchId)
  );
}

function compareHistory(a: MatchRecord, b: MatchRecord): number {
  return (
    Date.parse(b.date) - Date.parse(a.date) ||
    a.matchId.localeCompare(b.matchId)
  );
}

export function queryRanking(config: MatchConfig): RankingEntry[] {
  return allMatches()
    .filter((match) => sameConfig(match.config, config))
    .sort(compareRanking)
    .map((match, index) => ({
      position: index + 1,
      matchId: match.matchId,
      playerId: match.playerId,
      playerName: match.playerName,
      score: match.score,
      durationSec: match.durationSec,
      date: match.date,
    }));
}

export function queryMatches(playerId: string): MatchRecord[] {
  return allMatches()
    .filter((match) => match.playerId === playerId)
    .sort(compareHistory);
}

export function upsertMatch(record: MatchRecord): {
  record: MatchRecord;
  created: boolean;
} {
  const existing = allMatches().find((m) => m.matchId === record.matchId);
  if (existing) return { record: existing, created: false };

  writeStore(STORE_KEY, STORE_VERSION, [...loadConfirmed(), record]);
  return { record, created: true };
}

export function resetMockDb(): void {
  removeStore(STORE_KEY);
}

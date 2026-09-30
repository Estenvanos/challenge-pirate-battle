import { z } from "zod";
import { STORAGE_KEYS } from "../constants/storage";
import {
  matchRecordSchema,
  type MatchConfig,
  type MatchRecord,
  type RankingEntry,
  type SubmitMatchResponse,
} from "../schemas/match";
import { readStore, removeStore, writeStore } from "../storage/localStore";
import { fixtureMatches, manyPagesMatches } from "./fixtures/matches";
import { getScenario } from "./scenarios";

const STORE = STORAGE_KEYS.mockDb;

function loadConfirmed(): MatchRecord[] {
  return readStore(STORE, z.array(matchRecordSchema), []);
}

function fixturesForScenario(): readonly MatchRecord[] {
  switch (getScenario()) {
    case "empty":
      return [];
    case "manyPages":
      return [...fixtureMatches, ...manyPagesMatches];
    default:
      return fixtureMatches;
  }
}

function allMatches(): MatchRecord[] {
  return [...fixturesForScenario(), ...loadConfirmed()];
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

export function upsertMatch(record: MatchRecord): SubmitMatchResponse {
  const existing = allMatches().find((m) => m.matchId === record.matchId);
  if (existing) return { record: existing, created: false };

  writeStore(STORE, [...loadConfirmed(), record]);
  return { record, created: true };
}

export function resetMockDb(): void {
  removeStore(STORE);
}

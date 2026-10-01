import type { EndReason, MatchConfig, MatchRecord } from "../../schemas/match";
import { fixturePlayers, LOCAL_PLAYER_ID } from "./players";

export const fixtureConfigs: readonly MatchConfig[] = [
  { sessionTimeSec: 120, spawnIntervalSec: 3 },
  { sessionTimeSec: 60, spawnIntervalSec: 2 },
  { sessionTimeSec: 180, spawnIntervalSec: 4 },
];

const MATCH_COUNT = 40;
const BASE_DATE_MS = Date.UTC(2026, 0, 1, 12, 0, 0);
const HOUR_MS = 60 * 60 * 1000;

function buildMatch(index: number): MatchRecord {
  const player = fixturePlayers[index % fixturePlayers.length];
  const config = fixtureConfigs[index % fixtureConfigs.length];

  const destroyed = index % 5 === 4;
  const endReason: EndReason = destroyed ? "playerDestroyed" : "timeUp";
  const durationSec = destroyed
    ? Math.round(config.sessionTimeSec * 0.6) - (index % 7)
    : config.sessionTimeSec;

  const score = (index * 7) % 13;

  return {
    matchId: `fixture-${String(index + 1).padStart(3, "0")}`,
    playerId: player.playerId,
    playerName: player.playerName,
    date: new Date(BASE_DATE_MS + index * 7 * HOUR_MS).toISOString(),
    score,
    durationSec,
    endReason,
    config: { ...config },
  };
}

export const fixtureMatches: readonly MatchRecord[] = Array.from(
  { length: MATCH_COUNT },
  (_, index) => buildMatch(index),
);

const MANY_PAGES_RIVALS = 200;
const MANY_PAGES_LOCAL = 30;

export const manyPagesMatches: readonly MatchRecord[] = [
  ...Array.from({ length: MANY_PAGES_RIVALS }, (_, index) =>
    buildMatch(MATCH_COUNT + index),
  ),
  ...Array.from({ length: MANY_PAGES_LOCAL }, (_, index) => ({
    ...buildMatch(MATCH_COUNT + MANY_PAGES_RIVALS + index),
    playerId: LOCAL_PLAYER_ID,
    playerName: "Local Captain",
  })),
];

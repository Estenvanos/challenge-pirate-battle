import type { EndReason, MatchConfig, MatchRecord } from "../../api/contracts";
import { fixturePlayers } from "./players";

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

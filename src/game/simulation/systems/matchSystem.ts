import type { MatchConfig } from "../../../config/gameConfig";
import type { World } from "../World";

/** Runs last: player death wins ties with the match timer. */
export function matchSystem(
  world: World,
  dt: number,
  config: MatchConfig,
): void {
  if (world.endReason) return;
  world.elapsedSec = Math.min(config.sessionTimeSec, world.elapsedSec + dt);
  if (world.elapsedSec >= config.sessionTimeSec) world.endReason = "timeUp";
}

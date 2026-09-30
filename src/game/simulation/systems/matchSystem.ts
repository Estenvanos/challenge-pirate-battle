import type { MatchConfig } from "../../../config/gameConfig";
import type { World } from "../World";

/**
 * Cronômetro da partida: conta só o tempo de jogo ativo (os passos da
 * simulação) e encerra por tempo quando a sessão acaba. Roda por último: se o
 * jogador foi destruído neste passo, vale a derrota.
 */
export function matchSystem(
  world: World,
  dt: number,
  config: MatchConfig,
): void {
  if (world.endReason) return;
  world.elapsedSec = Math.min(config.sessionTimeSec, world.elapsedSec + dt);
  if (world.elapsedSec >= config.sessionTimeSec) world.endReason = "timeUp";
}

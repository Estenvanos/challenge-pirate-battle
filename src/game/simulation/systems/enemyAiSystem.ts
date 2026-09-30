import type { MatchConfig } from "../../../config/gameConfig";
import { angleDelta, angleTo, distance } from "../../physics/vector";
import type { Point } from "../../arena";
import type { Enemy } from "../entities";
import { nextWaypoint, updateFlowField } from "../navigation";
import type { World } from "../World";

/**
 * Leme proporcional ao erro de rumo, saturando em `fullRudderAngle`. Retorna
 * o erro (rad).
 */
function steerToward(
  enemy: Enemy,
  target: Point,
  fullRudderAngle: number,
): number {
  const error = angleDelta(enemy.rotation, angleTo(enemy, target));
  enemy.control.turn = Math.max(-1, Math.min(1, error / fullRudderAngle));
  return error;
}

/**
 * Decide o comando de cada inimigo (vela e leme); quem move é o
 * movementSystem, com a mesma física do jogador.
 * O rumo segue o campo de fluxo até o jogador (contorna ilhas); perto dele,
 * mira direto.
 * A vela abre conforme o alinhamento com o rumo: o navio freia nas curvas.
 * - Sem arma (Chaser): sempre rumo ao jogador.
 * - Com arma (Shooters): aproxima-se e recolhe a vela dentro de
 *   `keepDistance`; ele para e segue virando a proa para o jogador.
 */
export function enemyAiSystem(world: World, config: MatchConfig): void {
  const { player } = world;
  const { fullRudderAngle, minTurnThrottle, pathLookahead, kinds } =
    config.enemies;
  updateFlowField(world.flowField, world.navGrid, player);
  for (const enemy of world.enemies) {
    const waypoint = nextWaypoint(
      world.flowField,
      world.navGrid,
      enemy,
      pathLookahead,
    );
    const error = steerToward(enemy, waypoint ?? player, fullRudderAngle);
    const { weapon } = kinds[enemy.kind];
    const holding = weapon && distance(enemy, player) <= weapon.keepDistance;
    enemy.control.throttle = holding
      ? 0
      : Math.max(minTurnThrottle, Math.cos(error));
  }
}

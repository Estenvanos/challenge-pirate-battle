import type { MatchConfig } from "../../../config/gameConfig";
import { angleDelta, angleTo, distance } from "../../physics/vector";
import type { Point } from "../../arena";
import type { Enemy } from "../entities";
import { nextWaypoint, updateFlowField } from "../navigation";
import type { World } from "../World";

/** Leme proporcional ao erro de rumo, saturando em `fullRudderAngle`. */
function steerToward(
  enemy: Enemy,
  target: Point,
  fullRudderAngle: number,
): void {
  const error = angleDelta(enemy.rotation, angleTo(enemy, target));
  enemy.control.turn = Math.max(-1, Math.min(1, error / fullRudderAngle));
}

/**
 * Decide o comando de cada inimigo (vela e leme); quem move é o
 * movementSystem, com a mesma física do jogador.
 * O rumo segue o campo de fluxo até o jogador (contorna ilhas); perto dele,
 * mira direto.
 * - Sem arma (Chaser): vela sempre aberta, rumo ao jogador.
 * - Com arma (Shooters): aproxima-se e recolhe a vela dentro de
 *   `keepDistance`; à deriva ele para aos poucos e segue virando a proa para
 *   o jogador.
 */
export function enemyAiSystem(world: World, config: MatchConfig): void {
  const { player } = world;
  const { fullRudderAngle, pathLookahead, kinds } = config.enemies;
  updateFlowField(world.flowField, world.navGrid, player);
  for (const enemy of world.enemies) {
    const waypoint = nextWaypoint(
      world.flowField,
      world.navGrid,
      enemy,
      pathLookahead,
    );
    steerToward(enemy, waypoint ?? player, fullRudderAngle);
    const { weapon } = kinds[enemy.kind];
    enemy.control.forward =
      !weapon || distance(enemy, player) > weapon.keepDistance;
  }
}

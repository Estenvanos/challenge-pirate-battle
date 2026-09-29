import type { GameConfig } from "../../../config/gameConfig";
import type { ActionState } from "../../input/actions";
import type { World } from "../World";

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  return Math.max(target, current - maxDelta);
}

/**
 * Movimento com inércia, como um barco: a vela acelera aos poucos, sem ela o
 * navio segue à deriva até parar, e o leme muda o giro gradualmente. O giro
 * rende mais com velocidade (água passando pelo leme).
 */
export function movementSystem(
  world: World,
  actions: ActionState,
  dt: number,
  config: GameConfig,
): void {
  const ship = world.player;
  const {
    maxSpeed,
    acceleration,
    drag,
    maxTurnSpeed,
    turnAcceleration,
    minRudder,
  } = config.player;

  ship.speed = actions.forward
    ? approach(ship.speed, maxSpeed, acceleration * dt)
    : approach(ship.speed, 0, drag * dt);

  const rudder = minRudder + (1 - minRudder) * (ship.speed / maxSpeed);
  const turn = Number(actions.rotateRight) - Number(actions.rotateLeft);
  ship.angularVelocity = approach(
    ship.angularVelocity,
    turn * maxTurnSpeed * rudder,
    turnAcceleration * dt,
  );

  ship.rotation += ship.angularVelocity * dt;
  ship.x += Math.cos(ship.rotation) * ship.speed * dt;
  ship.y += Math.sin(ship.rotation) * ship.speed * dt;
}

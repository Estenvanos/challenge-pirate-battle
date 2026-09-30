import type { MatchConfig, ShipMotion } from "../../../config/gameConfig";
import type { ActionState } from "../../input/actions";
import type { Ship, ShipControl } from "../entities";
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
function sail(
  ship: Ship,
  control: ShipControl,
  motion: ShipMotion,
  dt: number,
): void {
  const {
    maxSpeed,
    acceleration,
    drag,
    maxTurnSpeed,
    turnAcceleration,
    minRudder,
  } = motion;

  ship.speed = control.forward
    ? approach(ship.speed, maxSpeed, acceleration * dt)
    : approach(ship.speed, 0, drag * dt);

  const rudder = minRudder + (1 - minRudder) * (ship.speed / maxSpeed);
  ship.angularVelocity = approach(
    ship.angularVelocity,
    control.turn * maxTurnSpeed * rudder,
    turnAcceleration * dt,
  );

  ship.rotation += ship.angularVelocity * dt;
  ship.x += Math.cos(ship.rotation) * ship.speed * dt;
  ship.y += Math.sin(ship.rotation) * ship.speed * dt;
}

/** Jogador segue as ações do input; inimigos, o comando decidido pela IA. */
export function movementSystem(
  world: World,
  actions: ActionState,
  dt: number,
  config: MatchConfig,
): void {
  sail(
    world.player,
    {
      forward: actions.forward,
      turn: Number(actions.rotateRight) - Number(actions.rotateLeft),
    },
    config.player,
    dt,
  );
  for (const enemy of world.enemies) {
    sail(enemy, enemy.control, config.enemies.kinds[enemy.kind], dt);
  }
}

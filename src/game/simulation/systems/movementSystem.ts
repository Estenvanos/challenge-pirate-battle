import type { MatchConfig, ShipMotion } from "../../../config/gameConfig";
import type { ActionState } from "../../input/actions";
import type { Ship, ShipControl } from "../entities";
import type { World } from "../World";

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  return Math.max(target, current - maxDelta);
}

/**
 * O leme gira o navio direto, sem inércia, igual parado ou em movimento. A
 * velocidade vai aos poucos até a pedida pela vela: `acceleration` subindo,
 * `drag` descendo.
 */
function sail(
  ship: Ship,
  control: ShipControl,
  motion: ShipMotion,
  dt: number,
): void {
  const { maxSpeed, acceleration, drag, turnSpeed } = motion;

  ship.rotation += control.turn * turnSpeed * dt;
  const target = maxSpeed * control.throttle;
  ship.speed = approach(
    ship.speed,
    target,
    (ship.speed < target ? acceleration : drag) * dt,
  );
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
      throttle: Number(actions.forward),
      turn: Number(actions.rotateRight) - Number(actions.rotateLeft),
    },
    config.player,
    dt,
  );
  for (const enemy of world.enemies) {
    sail(enemy, enemy.control, config.enemies.kinds[enemy.kind], dt);
  }
}

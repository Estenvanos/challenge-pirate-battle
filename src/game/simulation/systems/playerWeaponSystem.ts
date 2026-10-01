import type { MatchConfig } from "../../../config/gameConfig";
import type { ActionState } from "../../input/actions";
import type { World } from "../World";
import { spawnProjectile } from "./projectileSystem";

type Weapon = MatchConfig["player"]["weapons"]["front" | "side"];

/** Emits parallel shots from the hull without spawning inside it. */
function fire(
  world: World,
  weapon: "front" | "side",
  angle: number,
  muzzle: number,
  spec: Weapon,
  config: MatchConfig,
): void {
  const { id, x, y, rotation } = world.player;
  const { shotSpacing } = config.player.weapons;
  const originX = x + Math.cos(angle) * muzzle;
  const originY = y + Math.sin(angle) * muzzle;
  for (let i = 0; i < spec.shots; i++) {
    const offset = (i - (spec.shots - 1) / 2) * shotSpacing;
    spawnProjectile(
      world,
      "player",
      originX + Math.cos(rotation) * offset,
      originY + Math.sin(rotation) * offset,
      angle,
      spec,
      config,
    );
  }
  world.events.push({
    type: "shotFired",
    weapon,
    shipId: id,
    x: originX,
    y: originY,
    angle,
    shots: spec.shots,
  });
}

export function playerWeaponSystem(
  world: World,
  actions: ActionState,
  dt: number,
  config: MatchConfig,
): void {
  const { front, side } = config.player.weapons;
  const { rotation, radius } = world.player;
  const { hullHalfLength } = config.player;
  const cooldowns = world.playerCooldowns;
  // Positive rotation is clockwise on screen; starboard is +π/2.
  const weapons = [
    {
      slot: "front",
      pressed: actions.fireFront,
      angle: rotation,
      muzzle: hullHalfLength,
      spec: front,
    },
    {
      slot: "left",
      pressed: actions.fireLeft,
      angle: rotation - Math.PI / 2,
      muzzle: radius,
      spec: side,
    },
    {
      slot: "right",
      pressed: actions.fireRight,
      angle: rotation + Math.PI / 2,
      muzzle: radius,
      spec: side,
    },
  ] as const;

  for (const { slot, pressed, angle, muzzle, spec } of weapons) {
    cooldowns[slot] = Math.max(0, cooldowns[slot] - dt);
    if (!pressed || cooldowns[slot] > 0) continue;
    fire(
      world,
      slot === "front" ? "front" : "side",
      angle,
      muzzle,
      spec,
      config,
    );
    cooldowns[slot] = spec.cooldownSec;
  }
}

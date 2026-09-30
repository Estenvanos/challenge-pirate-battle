import type { MatchConfig } from "../../config/gameConfig";
import type { ActionState } from "../input/actions";
import { collisionSystem } from "./systems/collisionSystem";
import { enemyAiSystem } from "./systems/enemyAiSystem";
import { enemyWeaponSystem } from "./systems/enemyWeaponSystem";
import { movementSystem } from "./systems/movementSystem";
import { playerWeaponSystem } from "./systems/playerWeaponSystem";
import { projectileSystem } from "./systems/projectileSystem";
import { spawnSystem } from "./systems/spawnSystem";
import type { World } from "./World";

/** Um passo fixo da simulação, na ordem do ARCHITECTURE.md §3. */
export function stepWorld(
  world: World,
  actions: ActionState,
  dt: number,
  config: MatchConfig,
): void {
  // Guarda o estado anterior: o desenho interpola entre ele e o deste passo.
  for (const ship of [world.player, ...world.enemies]) {
    ship.prevX = ship.x;
    ship.prevY = ship.y;
    ship.prevRotation = ship.rotation;
  }
  for (const projectile of world.projectiles) {
    projectile.prevX = projectile.x;
    projectile.prevY = projectile.y;
  }

  enemyAiSystem(world, config);
  movementSystem(world, actions, dt, config);
  playerWeaponSystem(world, actions, dt, config);
  enemyWeaponSystem(world, dt, config);
  projectileSystem(world, dt, config);
  collisionSystem(world, config);
  spawnSystem(world, dt, config);
}

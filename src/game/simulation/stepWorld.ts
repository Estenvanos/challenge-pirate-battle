import type { MatchConfig } from "../../config/gameConfig";
import type { ActionState } from "../input/actions";
import { collisionSystem } from "./systems/collisionSystem";
import { enemyAiSystem } from "./systems/enemyAiSystem";
import { enemyWeaponSystem } from "./systems/enemyWeaponSystem";
import { movementSystem } from "./systems/movementSystem";
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
  enemyAiSystem(world, config);
  movementSystem(world, actions, dt, config);
  enemyWeaponSystem(world, dt, config);
  projectileSystem(world, dt, config);
  collisionSystem(world);
  spawnSystem(world, dt, config);
}

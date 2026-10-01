import type { Texture } from "pixi.js";
import { GAME_CONFIG } from "../../../config/gameConfig";
import type { Enemy } from "../../simulation/entities";
import { ShipView, type ShipLayers } from "./ShipView";

const SWAY_PHASE_STEP = 2.4;

const FADE_IN_SEC = 0.4;

/** Keeps each destroyed ship's view until its sinking animation finishes. */
export class EnemiesView {
  private readonly views = new Map<string, { enemy: Enemy; view: ShipView }>();
  private created = 0;

  constructor(
    private readonly layers: ShipLayers,
    private readonly wakeTexture: Texture,
    private readonly reducedMotion: boolean,
  ) {}

  sync(enemies: readonly Enemy[], alpha: number, dt: number): void {
    const alive = new Set(enemies);
    for (const enemy of enemies) {
      const { sprites, spriteScale, maxSpeed } =
        GAME_CONFIG.enemies.kinds[enemy.kind];
      let view = this.views.get(enemy.id)?.view;
      if (!view) {
        view = new ShipView(this.layers, {
          sprites,
          scale: spriteScale,
          wakeTexture: this.wakeTexture,
          reducedMotion: this.reducedMotion,
          phase: this.created++ * SWAY_PHASE_STEP,
          fadeInSec: FADE_IN_SEC,
          enemy: true,
        });
        this.views.set(enemy.id, { enemy, view });
      }
      view.sync(enemy, alpha, dt, maxSpeed);
    }
    for (const [id, { enemy, view }] of this.views) {
      if (alive.has(enemy)) continue;
      const { maxSpeed } = GAME_CONFIG.enemies.kinds[enemy.kind];
      view.sync(enemy, 1, dt, maxSpeed);
      if (!view.sunk) continue;
      view.destroy();
      this.views.delete(id);
    }
  }

  get(id: string): ShipView | undefined {
    return this.views.get(id)?.view;
  }

  destroy(): void {
    for (const { view } of this.views.values()) view.destroy();
    this.views.clear();
  }
}

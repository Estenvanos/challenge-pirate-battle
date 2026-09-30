import { Container } from "pixi.js";
import type { ShipSprite } from "../../assets/manifest";
import type { Enemy, EnemyKind } from "../../simulation/entities";
import { ShipView, type FrameSubscriber } from "./ShipView";

const SPRITE_BY_KIND: Readonly<Record<EnemyKind, ShipSprite>> = {
  chaser: "ship_3",
  shooter: "ship_6",
};

/** Defasagem do balanço entre navios (s), para não balançarem em uníssono. */
const SWAY_PHASE_STEP = 1.37;

/** Um ShipView por inimigo, criado e removido conforme o World. */
export class EnemiesView {
  readonly container = new Container();

  private readonly views = new Map<string, ShipView>();
  private created = 0;

  constructor(private readonly onFrame: FrameSubscriber) {}

  sync(enemies: readonly Enemy[]): void {
    const alive = new Set<string>();
    for (const enemy of enemies) {
      alive.add(enemy.id);
      let view = this.views.get(enemy.id);
      if (!view) {
        view = new ShipView(
          SPRITE_BY_KIND[enemy.kind],
          this.onFrame,
          this.created++ * SWAY_PHASE_STEP,
        );
        this.views.set(enemy.id, view);
        this.container.addChild(view.container);
      }
      view.sync(enemy);
    }
    for (const [id, view] of this.views) {
      if (alive.has(id)) continue;
      view.destroy();
      this.views.delete(id);
    }
  }

  destroy(): void {
    for (const view of this.views.values()) view.destroy();
    this.views.clear();
    this.container.destroy({ children: true });
  }
}

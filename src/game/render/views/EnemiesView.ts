import { Container } from "pixi.js";
import type { DamageSprites, ShipSprite } from "../../../config/enemies";
import { GAME_CONFIG } from "../../../config/gameConfig";
import type { Enemy } from "../../simulation/entities";
import { ShipView, type FrameSubscriber } from "./ShipView";

/** Casco cada vez mais danificado conforme a vida cai; cinza ao ser destruído. */
function damageSprite(
  { stages, destroyed }: DamageSprites,
  hp: number,
  maxHp: number,
): ShipSprite {
  if (hp <= 0) return destroyed;
  const stage = Math.floor(((maxHp - hp) * stages.length) / maxHp);
  return stages[Math.min(stage, stages.length - 1)];
}

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
      const { sprites, spriteScale } = GAME_CONFIG.enemies.kinds[enemy.kind];
      const sprite = damageSprite(sprites, enemy.hp, enemy.maxHp);
      let view = this.views.get(enemy.id);
      if (!view) {
        view = new ShipView(
          sprite,
          this.onFrame,
          this.created++ * SWAY_PHASE_STEP,
        );
        view.container.scale.set(spriteScale);
        this.views.set(enemy.id, view);
        this.container.addChild(view.container);
      }
      view.setSprite(sprite);
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

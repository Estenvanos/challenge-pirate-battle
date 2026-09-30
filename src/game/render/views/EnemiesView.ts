import type { Texture } from "pixi.js";
import type { DamageSprites, ShipSprite } from "../../../config/enemies";
import { GAME_CONFIG } from "../../../config/gameConfig";
import type { Enemy } from "../../simulation/entities";
import { ShipView, type ShipLayers } from "./ShipView";

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

/** Defasagem do balanço entre navios (rad), para não balançarem em uníssono. */
const SWAY_PHASE_STEP = 2.4;

/** Tempo para o inimigo recém-nascido surgir por completo (s). */
const FADE_IN_SEC = 0.4;

/** Um ShipView por inimigo, criado e removido conforme o World. */
export class EnemiesView {
  private readonly views = new Map<string, ShipView>();
  private created = 0;

  constructor(
    private readonly layers: ShipLayers,
    private readonly wakeTexture: Texture,
    private readonly reducedMotion: boolean,
  ) {}

  sync(enemies: readonly Enemy[], alpha: number, dt: number): void {
    const alive = new Set<string>();
    for (const enemy of enemies) {
      alive.add(enemy.id);
      const { sprites, spriteScale, maxSpeed } =
        GAME_CONFIG.enemies.kinds[enemy.kind];
      const sprite = damageSprite(sprites, enemy.hp, enemy.maxHp);
      let view = this.views.get(enemy.id);
      if (!view) {
        view = new ShipView(this.layers, {
          sprite,
          scale: spriteScale,
          wakeTexture: this.wakeTexture,
          reducedMotion: this.reducedMotion,
          phase: this.created++ * SWAY_PHASE_STEP,
          fadeInSec: FADE_IN_SEC,
        });
        this.views.set(enemy.id, view);
      }
      view.setSprite(sprite);
      view.sync(enemy, alpha, dt, maxSpeed);
    }
    for (const [id, view] of this.views) {
      if (alive.has(id)) continue;
      view.destroy();
      this.views.delete(id);
    }
  }

  /** View do inimigo `id`, se ele ainda existe. */
  get(id: string): ShipView | undefined {
    return this.views.get(id);
  }

  destroy(): void {
    for (const view of this.views.values()) view.destroy();
    this.views.clear();
  }
}

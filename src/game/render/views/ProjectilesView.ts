import { Container, Sprite } from "pixi.js";
import { getCannonBallTexture } from "../../assets/loadGameAssets";
import { lerp } from "../../physics/vector";
import type { Projectile } from "../../simulation/entities";
import type { FxTextures } from "../effects/fxTextures";

const BALL_SCALE = 1.4;
const ARC_GROWTH = 0.3;
const TRAIL = { maxLength: 110, width: 6 } as const;
const TRAIL_TINT = { player: 0xffffff, enemy: 0xffd0c0 } as const;
const SHADOW_TINT = 0x0b2233;
const SHADOW_NEAR = { x: 3, y: 5 } as const;
const SHADOW_RISE = { x: 8, y: 11 } as const;

interface ProjectileSprites {
  readonly root: Container;
  readonly shadow: Sprite;
  readonly trail: Sprite;
  readonly ball: Sprite;
}

/** Reuses sprites while projectiles appear, fly and disappear. */
export class ProjectilesView {
  readonly container = new Container();

  private readonly pool: ProjectileSprites[] = [];

  constructor(private readonly textures: FxTextures) {}

  sync(projectiles: readonly Projectile[], alpha: number): void {
    while (this.pool.length < projectiles.length) this.pool.push(this.create());
    this.pool.forEach(({ root, shadow, trail, ball }, i) => {
      const projectile = projectiles[i];
      root.visible = projectile !== undefined;
      if (!projectile) return;

      const angle = Math.atan2(projectile.vy, projectile.vx);
      root.position.set(
        lerp(projectile.prevX, projectile.x, alpha),
        lerp(projectile.prevY, projectile.y, alpha),
      );
      root.rotation = angle;
      trail.tint = TRAIL_TINT[projectile.owner];
      trail.width = Math.min(TRAIL.maxLength, projectile.travelled + 4);
      trail.height = TRAIL.width;

      const height = Math.sin(
        Math.min(1, projectile.travelled / projectile.range) * Math.PI,
      );
      ball.scale.set(BALL_SCALE * (1 + ARC_GROWTH * height));
      const offsetX = SHADOW_NEAR.x + SHADOW_RISE.x * height;
      const offsetY = SHADOW_NEAR.y + SHADOW_RISE.y * height;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      shadow.position.set(
        offsetX * cos + offsetY * sin,
        -offsetX * sin + offsetY * cos,
      );
      shadow.scale.set(0.24 * (1 - 0.3 * height));
      shadow.alpha = 0.4 * (1 - 0.35 * height);
    });
  }

  destroy(): void {
    this.pool.length = 0;
    this.container.destroy({ children: true });
  }

  private create(): ProjectileSprites {
    const shadow = new Sprite(this.textures.circle);
    shadow.anchor.set(0.5);
    shadow.tint = SHADOW_TINT;
    const trail = new Sprite(this.textures.trail);
    trail.anchor.set(1, 0.5);
    const ball = new Sprite(getCannonBallTexture());
    ball.anchor.set(0.5);
    const root = new Container();
    root.addChild(shadow, trail, ball);
    this.container.addChild(root);
    return { root, shadow, trail, ball };
  }
}

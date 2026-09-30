import { Container, Sprite, type Texture } from "pixi.js";
import {
  getCrewTextures,
  getEffectTexture,
  getMuzzleFlashTexture,
} from "../../assets/loadGameAssets";
import { createRng } from "../../core/random";
import type { FxTextures } from "../effects/fxTextures";

/** Caps live particles to keep visual feedback bounded under heavy combat. */
const MAX_PARTICLES = 700;

const SMOKE_TINT = 0xd8d8d8;
const DUST_TINT = 0xe5c88f;
const WOOD_TINT = 0x8a5a2b;
const LIGHT_SMOKE_TINT = 0x8c8c8c;
const DARK_SMOKE_TINT = 0x2e2e2e;

const CREW = {
  min: 2,
  max: 4,
  speedMin: 190,
  speedMax: 280,
  drag: 2.5,
  scaleFrom: 2.1,
  scaleTo: 0.9,
  life: 2.6,
  hold: 0.45,
  spin: 3,
  shadow: { tint: 0x000000, alpha: 0.35, offsetY: 6 },
} as const;

interface ParticleSpec {
  readonly texture: Texture;
  readonly x: number;
  readonly y: number;
  readonly life: number;
  readonly vx?: number;
  readonly vy?: number;
  readonly drag?: number;
  readonly scaleFrom: number;
  readonly scaleTo: number;
  readonly alphaFrom: number;
  readonly tint?: number;
  readonly under?: boolean;
  readonly rotation?: number;
  readonly spin?: number;
  readonly hold?: number;
}

interface Particle {
  readonly sprite: Sprite;
  age: number;
  life: number;
  vx: number;
  vy: number;
  drag: number;
  scaleFrom: number;
  scaleTo: number;
  alphaFrom: number;
  spin: number;
  hold: number;
}

/** Pooled visual particles; none of their state affects the simulation. */
export class EffectsView {
  readonly under = new Container();
  readonly over = new Container();

  private active: Particle[] = [];
  private readonly pool: Particle[] = [];
  private readonly rng = createRng(1337);

  constructor(private readonly textures: FxTextures) {}

  muzzle(x: number, y: number, angle: number, shots: number): void {
    this.spawn({
      texture: getMuzzleFlashTexture(),
      x,
      y,
      life: 0.14,
      scaleFrom: 0.35 + shots * 0.05,
      scaleTo: 0.6,
      alphaFrom: 1,
    });
    for (let i = 0; i < 2 + shots; i++) {
      const direction = angle + this.range(-0.5, 0.5);
      const speed = this.range(30, 70);
      this.spawn({
        texture: this.textures.circle,
        x,
        y,
        life: this.range(0.5, 0.8),
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        drag: 2.5,
        scaleFrom: 0.25,
        scaleTo: 0.8,
        alphaFrom: 0.55,
        tint: SMOKE_TINT,
      });
    }
  }

  splash(x: number, y: number): void {
    this.ripple(x, y, 0.5, 0.15, 0.75);
    for (let i = 0; i < 4; i++) {
      const direction = this.range(0, Math.PI * 2);
      this.spawn({
        texture: this.textures.circle,
        x,
        y,
        life: 0.35,
        vx: Math.cos(direction) * 60,
        vy: Math.sin(direction) * 60,
        drag: 4,
        scaleFrom: 0.18,
        scaleTo: 0.05,
        alphaFrom: 0.9,
      });
    }
  }

  dust(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const direction = this.range(0, Math.PI * 2);
      const speed = this.range(40, 90);
      this.spawn({
        texture: this.textures.circle,
        x,
        y,
        life: 0.5,
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        drag: 4,
        scaleFrom: 0.3,
        scaleTo: 0.6,
        alphaFrom: 0.8,
        tint: DUST_TINT,
      });
    }
  }

  hit(x: number, y: number): void {
    this.spawn({
      texture: getMuzzleFlashTexture(),
      x,
      y,
      life: 0.12,
      scaleFrom: 0.3,
      scaleTo: 0.55,
      alphaFrom: 1,
    });
    for (let i = 0; i < 5; i++) {
      const direction = this.range(0, Math.PI * 2);
      const speed = this.range(60, 140);
      this.spawn({
        texture: this.textures.circle,
        x,
        y,
        life: 0.4,
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        drag: 4,
        scaleFrom: 0.13,
        scaleTo: 0.05,
        alphaFrom: 1,
        tint: WOOD_TINT,
      });
    }
  }

  explosion(x: number, y: number): void {
    this.spawn({
      texture: getEffectTexture("explosion_1"),
      x,
      y,
      life: 0.45,
      scaleFrom: 0.8,
      scaleTo: 2.2,
      alphaFrom: 1,
    });
    this.spawn({
      texture: getEffectTexture("explosion_2"),
      x: x + this.range(-14, 14),
      y: y + this.range(-14, 14),
      life: 0.6,
      scaleFrom: 0.5,
      scaleTo: 1.7,
      alphaFrom: 0.9,
    });
    for (let i = 0; i < 8; i++) {
      const direction = this.range(0, Math.PI * 2);
      const speed = this.range(40, 110);
      this.spawn({
        texture: this.textures.circle,
        x,
        y,
        life: this.range(0.9, 1.4),
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        drag: 2,
        scaleFrom: 0.5,
        scaleTo: 1.6,
        alphaFrom: 0.6,
        tint: DARK_SMOKE_TINT,
      });
    }
    this.ripple(x, y, 1.2, 0.6, 3.2);
    this.ripple(x, y, 1.7, 0.3, 2.4);
  }

  smoke(x: number, y: number, heavy: boolean): void {
    const at = { x: x + this.range(-10, 10), y: y + this.range(-10, 10) };
    this.spawn({
      texture: this.textures.circle,
      ...at,
      life: 0.9,
      vx: this.range(-12, 12),
      vy: -28,
      scaleFrom: 0.2,
      scaleTo: 0.75,
      alphaFrom: heavy ? 0.5 : 0.3,
      tint: heavy ? DARK_SMOKE_TINT : LIGHT_SMOKE_TINT,
    });
    if (!heavy) return;
    this.spawn({
      texture: getEffectTexture(this.rng.next() < 0.5 ? "fire_1" : "fire_2"),
      ...at,
      life: 0.3,
      vy: -14,
      scaleFrom: 0.9,
      scaleTo: 0.5,
      alphaFrom: 0.95,
    });
  }

  crew(x: number, y: number): void {
    const textures = getCrewTextures();
    const count =
      CREW.min + Math.floor(this.rng.next() * (CREW.max - CREW.min + 1));
    for (let i = 0; i < count; i++) {
      const direction = ((i + this.rng.next() * 0.6) / count) * Math.PI * 2;
      const speed = this.range(CREW.speedMin, CREW.speedMax);
      const vx = Math.cos(direction) * speed;
      const vy = Math.sin(direction) * speed;
      const common = {
        texture: this.rng.pick(textures),
        life: CREW.life,
        vx,
        vy,
        drag: CREW.drag,
        scaleFrom: CREW.scaleFrom,
        scaleTo: CREW.scaleTo,
        rotation: this.range(0, Math.PI * 2),
        spin: this.range(-CREW.spin, CREW.spin),
        hold: CREW.hold,
        under: true,
      };
      this.spawn({
        ...common,
        x,
        y: y + CREW.shadow.offsetY,
        alphaFrom: CREW.shadow.alpha,
        tint: CREW.shadow.tint,
      });
      this.spawn({ ...common, x, y, alphaFrom: 1 });
      this.ripple(x + vx / CREW.drag, y + vy / CREW.drag, 0.7, 0.15, 0.9);
    }
  }

  foam(x: number, y: number, rotation: number): void {
    this.spawn({
      texture: this.textures.circle,
      x: x + this.range(-6, 6),
      y: y + this.range(-6, 6),
      life: 0.8,
      vx: -Math.cos(rotation) * 12,
      vy: -Math.sin(rotation) * 12,
      scaleFrom: 0.35,
      scaleTo: 0.95,
      alphaFrom: 0.22,
      under: true,
    });
  }

  ripple(x: number, y: number, life = 0.9, scaleFrom = 0.4, scaleTo = 2.2) {
    this.spawn({
      texture: this.textures.ring,
      x,
      y,
      life,
      scaleFrom,
      scaleTo,
      alphaFrom: 0.85,
      under: true,
    });
  }

  update(dt: number): void {
    this.active = this.active.filter((particle) => {
      particle.age += dt;
      const { sprite } = particle;
      if (particle.age >= particle.life) {
        sprite.removeFromParent();
        this.pool.push(particle);
        return false;
      }
      const t = particle.age / particle.life;
      const slow = Math.max(0, 1 - particle.drag * dt);
      particle.vx *= slow;
      particle.vy *= slow;
      particle.spin *= slow;
      sprite.x += particle.vx * dt;
      sprite.y += particle.vy * dt;
      sprite.rotation += particle.spin * dt;
      sprite.scale.set(
        particle.scaleFrom + (particle.scaleTo - particle.scaleFrom) * t,
      );
      const fade = Math.max(0, t - particle.hold) / (1 - particle.hold);
      sprite.alpha = particle.alphaFrom * (1 - fade);
      return true;
    });
  }

  destroy(): void {
    for (const { sprite } of this.pool) sprite.destroy();
    this.pool.length = 0;
    this.active.length = 0;
    this.under.destroy({ children: true });
    this.over.destroy({ children: true });
  }

  private range(min: number, max: number): number {
    return min + this.rng.next() * (max - min);
  }

  private spawn(spec: ParticleSpec): void {
    if (this.active.length >= MAX_PARTICLES) return;
    const particle = this.pool.pop() ?? {
      sprite: new Sprite(),
      age: 0,
      life: 0,
      vx: 0,
      vy: 0,
      drag: 0,
      scaleFrom: 1,
      scaleTo: 1,
      alphaFrom: 1,
      spin: 0,
      hold: 0,
    };
    const { sprite } = particle;
    sprite.texture = spec.texture;
    sprite.anchor.set(0.5);
    sprite.position.set(spec.x, spec.y);
    sprite.tint = spec.tint ?? 0xffffff;
    sprite.scale.set(spec.scaleFrom);
    sprite.rotation = spec.rotation ?? 0;
    sprite.alpha = spec.alphaFrom;
    particle.age = 0;
    particle.life = spec.life;
    particle.vx = spec.vx ?? 0;
    particle.vy = spec.vy ?? 0;
    particle.drag = spec.drag ?? 0;
    particle.scaleFrom = spec.scaleFrom;
    particle.scaleTo = spec.scaleTo;
    particle.alphaFrom = spec.alphaFrom;
    particle.spin = spec.spin ?? 0;
    particle.hold = spec.hold ?? 0;
    (spec.under ? this.under : this.over).addChild(sprite);
    this.active.push(particle);
  }
}

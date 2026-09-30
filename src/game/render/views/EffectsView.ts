import { Container, Sprite, type Texture } from "pixi.js";
import { getMuzzleFlashTexture } from "../../assets/loadGameAssets";
import { createRng } from "../../core/random";
import type { FxTextures } from "../effects/fxTextures";

/** Teto de partículas vivas; acima dele, efeitos novos são descartados. */
const MAX_PARTICLES = 700;

const SMOKE_TINT = 0xd8d8d8;
const DUST_TINT = 0xe5c88f;

interface ParticleSpec {
  readonly texture: Texture;
  readonly x: number;
  readonly y: number;
  /** Duração (s). */
  readonly life: number;
  readonly vx?: number;
  readonly vy?: number;
  /** Freio da velocidade (1/s). */
  readonly drag?: number;
  readonly scaleFrom: number;
  readonly scaleTo: number;
  readonly alphaFrom: number;
  readonly tint?: number;
  /** Desenhada abaixo dos navios (na água) em vez de acima. */
  readonly under?: boolean;
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
}

/**
 * Efeitos visuais de curta duração (fumaça, respingos, espuma) como partículas
 * com pool: os sprites são reaproveitados. Só visual: nada aqui afeta o jogo.
 */
export class EffectsView {
  /** Camada abaixo dos navios: o que acontece na água. */
  readonly under = new Container();
  /** Camada acima dos navios: fumaça e clarões. */
  readonly over = new Container();

  private active: Particle[] = [];
  private readonly pool: Particle[] = [];
  // Seed fixa: os efeitos saem iguais a cada execução (screenshots estáveis).
  private readonly rng = createRng(1337);

  constructor(private readonly textures: FxTextures) {}

  /** Clarão e fumaça na boca do canhão; `shots` aumenta o efeito na bordada. */
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

  /** Projétil caindo na água: anel e gotas. */
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

  /** Projétil batendo numa ilha: poeira de areia. */
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

  /** Espuma deixada pela popa de um navio que segue no rumo `rotation`. */
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

  /** Anel que se abre na água (spawn de inimigo, queda de projétil). */
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
      sprite.x += particle.vx * dt;
      sprite.y += particle.vy * dt;
      sprite.scale.set(
        particle.scaleFrom + (particle.scaleTo - particle.scaleFrom) * t,
      );
      sprite.alpha = particle.alphaFrom * (1 - t);
      return true;
    });
  }

  destroy(): void {
    // Sprites no pool estão fora da cena: precisam ser destruídos à parte.
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
    };
    const { sprite } = particle;
    sprite.texture = spec.texture;
    sprite.anchor.set(0.5);
    sprite.position.set(spec.x, spec.y);
    sprite.tint = spec.tint ?? 0xffffff;
    sprite.scale.set(spec.scaleFrom);
    sprite.alpha = spec.alphaFrom;
    particle.age = 0;
    particle.life = spec.life;
    particle.vx = spec.vx ?? 0;
    particle.vy = spec.vy ?? 0;
    particle.drag = spec.drag ?? 0;
    particle.scaleFrom = spec.scaleFrom;
    particle.scaleTo = spec.scaleTo;
    particle.alphaFrom = spec.alphaFrom;
    (spec.under ? this.under : this.over).addChild(sprite);
    this.active.push(particle);
  }
}

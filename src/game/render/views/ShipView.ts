import { Container, MeshRope, Point, Sprite, Texture } from "pixi.js";
import type { DamageSprites, ShipSprite } from "../../../config/enemies";
import {
  getEffectTexture,
  getHealthBarTextures,
  getShipTexture,
} from "../../assets/loadGameAssets";
import { angleDelta, lerp } from "../../physics/vector";
import type { Ship } from "../../simulation/entities";

// Ship artwork points down (+y); simulation heading zero points right (+x).
const SPRITE_FORWARD_OFFSET = -Math.PI / 2;

const SWAY = { frequencyHz: 0.55, rotation: 0.025, scale: 0.015 } as const;

const SHADOW = { tint: 0x0b2233, alpha: 0.22, x: 7, y: 10 } as const;

// Each wake side is a rope sampled behind the stern and drifting outward.
const WAKE = {
  points: 16,
  sampleSec: 1 / 30,
  spread: 0.18,
  sternOffset: 44,
  halfBeam: 11,
  fullAlphaAt: 1 / 1.6,
} as const;

const RECOIL_DECAY = 14;

const BAR = {
  scale: 0.65,
  gap: 14,
  fillFrom: 24,
  fillTo: 139,
  lowHp: 1 / 3,
} as const;

const SINK = { sec: 1.6, shrink: 0.45, roll: 0.5, tint: 0x2f7fa8 } as const;

const HIT_FLASH = { tint: 0xff5a4a, decay: 7 } as const;

const HEAL = {
  auraSec: 0.5,
  auraFrom: 0.8,
  auraTo: 1.6,
  plusSec: 0.9,
  plusRise: 46,
  plusScale: 0.75,
} as const;

function damageSprite(
  { stages, destroyed }: DamageSprites,
  hp: number,
  maxHp: number,
): ShipSprite {
  if (hp <= 0) return destroyed;
  const stage = Math.floor(((maxHp - hp) * stages.length) / maxHp);
  return stages[Math.min(stage, stages.length - 1)];
}

function mixColor(from: number, to: number, t: number): number {
  const channel = (shift: number) =>
    Math.round(lerp((from >> shift) & 0xff, (to >> shift) & 0xff, t)) << shift;
  return channel(16) | channel(8) | channel(0);
}

export interface ShipLayers {
  readonly wakes: Container;
  readonly shadows: Container;
  readonly hulls: Container;
  readonly bars: Container;
}

export interface ShipViewOptions {
  readonly sprites: DamageSprites;
  readonly scale: number;
  readonly wakeTexture: Texture;
  readonly reducedMotion: boolean;
  readonly phase?: number;
  readonly fadeInSec?: number;
  /** Enemy bars are always red; the player's turns red only at low HP. */
  readonly enemy?: boolean;
}

interface WakeSide {
  readonly rope: MeshRope;
  readonly points: Point[];
  readonly drift: Point[];
  readonly sign: 1 | -1;
}

/** Mirrors one ship without changing gameplay state. */
export class ShipView {
  private readonly body = new Container();
  private readonly hull: Sprite;
  private readonly shadow: Sprite;
  private readonly wake: WakeSide[];
  private readonly bar = new Container();
  private readonly barTextures = getHealthBarTextures();
  private readonly fillTexture: Texture;
  private readonly sprites: DamageSprites;
  private readonly scale: number;
  private readonly reducedMotion: boolean;
  private readonly fadeInSec: number;
  private readonly enemy: boolean;
  private swayPhase: number;
  private swayTime = 0;
  private wakeClock = 0;
  private wakeStarted = false;
  private recoilX = 0;
  private recoilY = 0;
  private flashAmount = 0;
  private sinkTime = 0;
  private shownHp = Number.NaN;
  private readonly layers: ShipLayers;
  private healSprites: { aura: Sprite; plus: Sprite } | null = null;
  private healTime = Number.POSITIVE_INFINITY;

  constructor(layers: ShipLayers, options: ShipViewOptions) {
    const texture = getShipTexture(options.sprites.stages[0]);
    this.layers = layers;
    this.sprites = options.sprites;
    this.scale = options.scale;
    this.reducedMotion = options.reducedMotion;
    this.fadeInSec = options.fadeInSec ?? 0;
    this.enemy = options.enemy ?? false;
    this.swayPhase = options.phase ?? 0;

    this.hull = new Sprite(texture);
    this.hull.anchor.set(0.5);
    this.body.addChild(this.hull);
    this.body.alpha = this.fadeInSec > 0 ? 0 : 1;

    this.shadow = new Sprite(texture);
    this.shadow.anchor.set(0.5);
    this.shadow.tint = SHADOW.tint;

    this.wake = ([1, -1] as const).map((sign) => {
      const points = Array.from({ length: WAKE.points }, () => new Point());
      const drift = Array.from({ length: WAKE.points }, () => new Point());
      const rope = new MeshRope({ texture: options.wakeTexture, points });
      layers.wakes.addChild(rope);
      return { rope, points, drift, sign };
    });
    layers.shadows.addChild(this.shadow);
    layers.hulls.addChild(this.body);

    const frame = new Sprite(this.barTextures.frame);
    frame.anchor.set(0.5);
    const { source } = this.barTextures.green;
    this.fillTexture = new Texture({
      source,
      frame: this.barTextures.green.frame.clone(),
      dynamic: true,
    });
    const fill = new Sprite(this.fillTexture);
    fill.anchor.set(0, 0.5);
    fill.x = -frame.width / 2;
    this.bar.addChild(frame, fill);
    this.bar.scale.set(BAR.scale);
    layers.bars.addChild(this.bar);
  }

  get sunk(): boolean {
    return this.sinkTime >= SINK.sec;
  }

  /** Interpolates the ship transform and advances visual-only animations. */
  sync(ship: Ship, alpha: number, dt: number, maxSpeed: number): void {
    const x = lerp(ship.prevX, ship.x, alpha);
    const y = lerp(ship.prevY, ship.y, alpha);
    const rotation =
      ship.prevRotation + angleDelta(ship.prevRotation, ship.rotation) * alpha;

    const decay = Math.exp(-RECOIL_DECAY * dt);
    this.recoilX *= decay;
    this.recoilY *= decay;
    this.swayTime += dt;
    const sway = this.reducedMotion
      ? 0
      : Math.sin(
          this.swayTime * SWAY.frequencyHz * Math.PI * 2 + this.swayPhase,
        );
    const sinking = ship.hp <= 0;
    if (sinking) this.sinkTime += dt;
    const sink = Math.min(1, this.sinkTime / SINK.sec);
    const sinkMotion = this.reducedMotion ? 0 : sink;
    if (sinking) {
      this.body.alpha = 1 - sink * sink;
    } else if (this.body.alpha < 1) {
      this.body.alpha = Math.min(1, this.body.alpha + dt / this.fadeInSec);
    }

    this.setSprite(damageSprite(this.sprites, ship.hp, ship.maxHp));
    this.flashAmount *= Math.exp(-HIT_FLASH.decay * dt);
    this.hull.tint = sinking
      ? mixColor(0xffffff, SINK.tint, sink)
      : mixColor(0xffffff, HIT_FLASH.tint, this.flashAmount);

    const { body, shadow, bar } = this;
    body.position.set(x + this.recoilX, y + this.recoilY);
    body.rotation =
      rotation +
      SPRITE_FORWARD_OFFSET +
      sway * SWAY.rotation +
      sinkMotion * SINK.roll;
    body.scale.set(
      this.scale * (1 + sway * SWAY.scale) * (1 - sinkMotion * SINK.shrink),
    );

    bar.visible = !sinking;
    bar.alpha = body.alpha;
    // Above the hull, or below it when it would cross the arena's top edge (y = 0).
    const barOffset = (this.hull.texture.height / 2) * this.scale + BAR.gap;
    const barHalfHeight = (this.barTextures.frame.height * BAR.scale) / 2;
    const fitsAbove = y - barOffset - barHalfHeight >= 0;
    bar.position.set(x, fitsAbove ? y - barOffset : y + barOffset);
    this.syncBar(ship.hp, ship.maxHp);

    shadow.position.set(body.x + SHADOW.x, body.y + SHADOW.y);
    shadow.rotation = body.rotation;
    shadow.scale.copyFrom(body.scale);
    shadow.alpha = SHADOW.alpha * body.alpha;

    this.syncHeal(x, y, dt);
    this.syncWake(x, y, rotation, ship.speed, dt);
    const wakeAlpha =
      Math.min(1, ship.speed / (maxSpeed * WAKE.fullAlphaAt)) * body.alpha;
    for (const { rope } of this.wake) rope.alpha = wakeAlpha;
  }

  flash(): void {
    this.flashAmount = 1;
  }

  heal(): void {
    if (!this.healSprites) {
      const aura = new Sprite(getEffectTexture("heal_aura"));
      aura.anchor.set(0.5);
      const plus = new Sprite(getEffectTexture("heal_plus"));
      plus.anchor.set(0.5);
      this.layers.shadows.addChild(aura);
      this.layers.bars.addChild(plus);
      this.healSprites = { aura, plus };
    }
    this.healTime = 0;
  }

  private setSprite(sprite: ShipSprite): void {
    const texture = getShipTexture(sprite);
    if (this.hull.texture === texture) return;
    this.hull.texture = texture;
    this.shadow.texture = texture;
  }

  recoil(angle: number, amount: number): void {
    if (this.reducedMotion) return;
    this.recoilX -= Math.cos(angle) * amount;
    this.recoilY -= Math.sin(angle) * amount;
  }

  destroy(): void {
    this.body.destroy({ children: true });
    this.shadow.destroy();
    for (const { rope } of this.wake) rope.destroy();
    this.bar.destroy({ children: true });
    this.healSprites?.aura.destroy();
    this.healSprites?.plus.destroy();
    this.fillTexture.destroy();
  }

  private syncHeal(x: number, y: number, dt: number): void {
    if (!this.healSprites) return;
    const { aura, plus } = this.healSprites;
    this.healTime += dt;

    const auraT = this.healTime / HEAL.auraSec;
    aura.visible = auraT < 1;
    if (aura.visible) {
      const hullLength = this.hull.texture.height * this.scale;
      aura.position.set(x, y);
      aura.scale.set(
        (hullLength * lerp(HEAL.auraFrom, HEAL.auraTo, auraT)) /
          aura.texture.width,
      );
      aura.alpha = 1 - auraT;
    }

    const plusT = this.healTime / HEAL.plusSec;
    plus.visible = plusT < 1;
    if (plus.visible) {
      const rise = 1 - (1 - plusT) * (1 - plusT);
      plus.position.set(x, y - rise * HEAL.plusRise);
      plus.scale.set(HEAL.plusScale * Math.min(1, 0.5 + plusT * 4));
      plus.alpha = Math.min(1, (1 - plusT) * 2);
    }
  }

  private syncBar(hp: number, maxHp: number): void {
    if (hp === this.shownHp) return;
    this.shownHp = hp;
    const ratio = hp / maxHp;
    const { green, red } = this.barTextures;
    const useRed = this.enemy || ratio <= BAR.lowHp;
    this.fillTexture.source = (useRed ? red : green).source;
    this.fillTexture.frame.width = lerp(BAR.fillFrom, BAR.fillTo, ratio);
    this.fillTexture.update();
  }

  /** Recycles the oldest rope point at the stern; newer points drift outward. */
  private syncWake(
    x: number,
    y: number,
    rotation: number,
    speed: number,
    dt: number,
  ): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const stern = WAKE.sternOffset * this.scale;
    const beam = WAKE.halfBeam * this.scale;

    this.wakeClock += dt;
    // Seed the entire rope at the stern to avoid a trail from the map origin.
    const samples = this.wakeStarted
      ? Math.min(WAKE.points, Math.floor(this.wakeClock / WAKE.sampleSec))
      : WAKE.points;
    this.wakeClock =
      samples === WAKE.points ? 0 : this.wakeClock - samples * WAKE.sampleSec;
    this.wakeStarted = true;

    for (const { points, drift, sign } of this.wake) {
      for (let i = 0; i < points.length; i++) {
        points[i].x += drift[i].x * dt;
        points[i].y += drift[i].y * dt;
      }
      const cornerX = x - cos * stern - sin * beam * sign;
      const cornerY = y - sin * stern + cos * beam * sign;
      for (let i = 0; i < samples; i++) {
        const point = points.shift()!;
        const pointDrift = drift.shift()!;
        point.set(cornerX, cornerY);
        pointDrift.set(
          -sin * sign * speed * WAKE.spread,
          cos * sign * speed * WAKE.spread,
        );
        points.push(point);
        drift.push(pointDrift);
      }
      points[points.length - 1].set(cornerX, cornerY);
    }
  }
}

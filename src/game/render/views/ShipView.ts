import { Container, MeshRope, Point, Sprite, type Texture } from "pixi.js";
import { getShipTexture } from "../../assets/loadGameAssets";
import type { ShipSprite } from "../../assets/manifest";
import { angleDelta, lerp } from "../../physics/vector";
import type { Ship } from "../../simulation/entities";

// Os PNGs dos navios têm a proa para baixo (+y); a entidade usa 0 = +x.
const SPRITE_FORWARD_OFFSET = -Math.PI / 2;

// Balanço no mar (só visual): um seno lento gira e "respira" o casco.
const SWAY = { frequencyHz: 0.55, rotation: 0.025, scale: 0.015 } as const;

// Sombra: o próprio casco, escuro e deslocado, sob todos os navios.
const SHADOW = { tint: 0x0b2233, alpha: 0.22, x: 7, y: 10 } as const;

// Esteira: uma faixa por lado, saindo dos cantos da popa e abrindo para fora.
const WAKE = {
  points: 16,
  /** Intervalo entre amostras da posição da popa (s). */
  sampleSec: 1 / 30,
  /** Velocidade com que a faixa se abre, como fração da velocidade do navio. */
  spread: 0.18,
  /** Canto da popa no casco sem escala: distância atrás do centro e meia boca (px). */
  sternOffset: 44,
  halfBeam: 11,
  /** A esteira fica opaca a partir desta fração da velocidade máxima. */
  fullAlphaAt: 1 / 1.6,
} as const;

/** Decaimento do recuo do tiro (1/s). */
const RECOIL_DECAY = 14;

/** Camadas compartilhadas por todos os navios, de baixo para cima. */
export interface ShipLayers {
  readonly wakes: Container;
  readonly shadows: Container;
  readonly hulls: Container;
}

export interface ShipViewOptions {
  readonly sprite: ShipSprite;
  /** Escala do casco; sombra e esteira acompanham. */
  readonly scale: number;
  readonly wakeTexture: Texture;
  /** `prefers-reduced-motion`: sem balanço nem recuo. */
  readonly reducedMotion: boolean;
  /** Defasagem do balanço (rad), para os navios não balançarem em uníssono. */
  readonly phase?: number;
  /** Surge aos poucos em vez de aparecer de uma vez (s). */
  readonly fadeInSec?: number;
}

interface WakeSide {
  readonly rope: MeshRope;
  readonly points: Point[];
  /** Velocidade lateral de cada ponto (px/s). */
  readonly drift: Point[];
  readonly sign: 1 | -1;
}

/**
 * Espelho visual de um navio: lê a entidade a cada quadro e não guarda estado
 * de jogo. Balanço, sombra, esteira e recuo são só visuais.
 */
export class ShipView {
  private readonly body = new Container();
  private readonly hull: Sprite;
  private readonly shadow: Sprite;
  private readonly wake: WakeSide[];
  private readonly scale: number;
  private readonly reducedMotion: boolean;
  private readonly fadeInSec: number;
  private swayPhase: number;
  private swayTime = 0;
  private wakeClock = 0;
  private wakeStarted = false;
  private recoilX = 0;
  private recoilY = 0;

  constructor(layers: ShipLayers, options: ShipViewOptions) {
    const texture = getShipTexture(options.sprite);
    this.scale = options.scale;
    this.reducedMotion = options.reducedMotion;
    this.fadeInSec = options.fadeInSec ?? 0;
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
  }

  /**
   * `alpha` (0–1) interpola do estado do passo anterior ao atual; `dt` é o
   * tempo do quadro (s) e `maxSpeed` a velocidade máxima deste navio.
   */
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
    if (this.body.alpha < 1) {
      this.body.alpha = Math.min(1, this.body.alpha + dt / this.fadeInSec);
    }

    const { body, shadow } = this;
    body.position.set(x + this.recoilX, y + this.recoilY);
    body.rotation = rotation + SPRITE_FORWARD_OFFSET + sway * SWAY.rotation;
    body.scale.set(this.scale * (1 + sway * SWAY.scale));
    shadow.position.set(body.x + SHADOW.x, body.y + SHADOW.y);
    shadow.rotation = body.rotation;
    shadow.scale.copyFrom(body.scale);
    shadow.alpha = SHADOW.alpha * body.alpha;

    this.syncWake(x, y, rotation, ship.speed, dt);
    const wakeAlpha =
      Math.min(1, ship.speed / (maxSpeed * WAKE.fullAlphaAt)) * body.alpha;
    for (const { rope } of this.wake) rope.alpha = wakeAlpha;
  }

  /** Troca a aparência do casco (estágio de dano). */
  setSprite(sprite: ShipSprite): void {
    const texture = getShipTexture(sprite);
    if (this.hull.texture === texture) return;
    this.hull.texture = texture;
    this.shadow.texture = texture;
  }

  /** Empurra o casco para trás do tiro disparado na direção `angle`. */
  recoil(angle: number, amount: number): void {
    if (this.reducedMotion) return;
    this.recoilX -= Math.cos(angle) * amount;
    this.recoilY -= Math.sin(angle) * amount;
  }

  destroy(): void {
    // Texturas são compartilhadas (cache do Assets, fxTextures): só a cena é destruída.
    this.body.destroy({ children: true });
    this.shadow.destroy();
    for (const { rope } of this.wake) rope.destroy();
  }

  /**
   * A cada amostra, o ponto mais antigo da faixa volta para o canto da popa e
   * ganha uma deriva para fora; os demais seguem derivando. O último ponto
   * fica sempre colado na popa.
   */
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
    // Primeira vez: a faixa inteira nasce na popa, sem riscar desde a origem.
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

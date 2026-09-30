import { Container, MeshRope, Point, Sprite, Texture } from "pixi.js";
import type { DamageSprites, ShipSprite } from "../../../config/enemies";
import {
  getEffectTexture,
  getHealthBarTextures,
  getShipTexture,
} from "../../assets/loadGameAssets";
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

// Barra de vida sobre o navio: moldura e preenchimento de ui/hud (160×40 px).
const BAR = {
  scale: 0.65,
  /** Folga entre a ponta do casco e a barra (px). */
  gap: 14,
  /** Trecho do preenchimento na arte, da vida 0 à cheia (px em x). */
  fillFrom: 24,
  fillTo: 139,
  /** Abaixo desta fração da vida o preenchimento fica vermelho. */
  lowHp: 1 / 3,
} as const;

// Naufrágio: o casco cinza encolhe, aderna e some na cor da água.
const SINK = { sec: 1.6, shrink: 0.45, roll: 0.5, tint: 0x2f7fa8 } as const;

// Clarão avermelhado ao levar dano, e seu decaimento (1/s).
const HIT_FLASH = { tint: 0xff5a4a, decay: 7 } as const;

// Reparo: uma aura verde rápida se abre em volta do casco e um sinal de vida
// sobe a partir dele.
const HEAL = {
  auraSec: 0.5,
  /** Diâmetro da aura, do início ao fim, em comprimentos do casco. */
  auraFrom: 0.8,
  auraTo: 1.6,
  plusSec: 0.9,
  /** Quanto o sinal sobe (px) e sua escala. */
  plusRise: 46,
  plusScale: 0.75,
} as const;

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

/** Cor entre `from` e `to` (0xRRGGBB), canal a canal. */
function mixColor(from: number, to: number, t: number): number {
  const channel = (shift: number) =>
    Math.round(lerp((from >> shift) & 0xff, (to >> shift) & 0xff, t)) << shift;
  return channel(16) | channel(8) | channel(0);
}

/** Camadas compartilhadas por todos os navios, de baixo para cima. */
export interface ShipLayers {
  readonly wakes: Container;
  readonly shadows: Container;
  readonly hulls: Container;
  /** Barras de vida, acima de tudo. */
  readonly bars: Container;
}

export interface ShipViewOptions {
  /** Aparência do casco conforme a vida. */
  readonly sprites: DamageSprites;
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
 * de jogo. Balanço, sombra, esteira, recuo, barra de vida e naufrágio são só
 * visuais.
 */
export class ShipView {
  private readonly body = new Container();
  private readonly hull: Sprite;
  private readonly shadow: Sprite;
  private readonly wake: WakeSide[];
  private readonly bar = new Container();
  private readonly barTextures = getHealthBarTextures();
  /** Recorte próprio do preenchimento: a largura acompanha a vida. */
  private readonly fillTexture: Texture;
  private readonly sprites: DamageSprites;
  private readonly scale: number;
  private readonly reducedMotion: boolean;
  private readonly fadeInSec: number;
  private swayPhase: number;
  private swayTime = 0;
  private wakeClock = 0;
  private wakeStarted = false;
  private recoilX = 0;
  private recoilY = 0;
  private flashAmount = 0;
  private sinkTime = 0;
  /** Vida mostrada na barra; ela só é refeita quando a vida muda. */
  private shownHp = Number.NaN;
  private readonly layers: ShipLayers;
  /** Aura e sinal do reparo; criados só no primeiro reparo deste navio. */
  private healSprites: { aura: Sprite; plus: Sprite } | null = null;
  /** Tempo desde o último reparo (s). */
  private healTime = Number.POSITIVE_INFINITY;

  constructor(layers: ShipLayers, options: ShipViewOptions) {
    const texture = getShipTexture(options.sprites.stages[0]);
    this.layers = layers;
    this.sprites = options.sprites;
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

  /** O casco terminou de afundar: a view já pode ser destruída. */
  get sunk(): boolean {
    return this.sinkTime >= SINK.sec;
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
    const sinking = ship.hp <= 0;
    if (sinking) this.sinkTime += dt;
    const sink = Math.min(1, this.sinkTime / SINK.sec);
    // `prefers-reduced-motion`: o naufrágio só esvanece.
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
    bar.position.set(
      x,
      y - (this.hull.texture.height / 2) * this.scale - BAR.gap,
    );
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

  /** Clarão no casco ao levar dano. */
  flash(): void {
    this.flashAmount = 1;
  }

  /** Anima o reparo: aura verde em volta do casco e sinal de vida subindo. */
  heal(): void {
    if (!this.healSprites) {
      const aura = new Sprite(getEffectTexture("heal_aura"));
      aura.anchor.set(0.5);
      const plus = new Sprite(getEffectTexture("heal_plus"));
      plus.anchor.set(0.5);
      // A aura fica sob o casco (na camada das sombras); o sinal, acima de tudo.
      this.layers.shadows.addChild(aura);
      this.layers.bars.addChild(plus);
      this.healSprites = { aura, plus };
    }
    this.healTime = 0;
  }

  /** Troca a aparência do casco (estágio de dano). */
  private setSprite(sprite: ShipSprite): void {
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
    this.bar.destroy({ children: true });
    this.healSprites?.aura.destroy();
    this.healSprites?.plus.destroy();
    // Só o recorte: a imagem (source) é do cache do Assets.
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
      // Sobe rápido e desacelera; some só na segunda metade.
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
    this.fillTexture.source = (ratio <= BAR.lowHp ? red : green).source;
    this.fillTexture.frame.width = lerp(BAR.fillFrom, BAR.fillTo, ratio);
    this.fillTexture.update();
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

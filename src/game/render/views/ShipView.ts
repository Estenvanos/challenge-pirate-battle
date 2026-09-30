import { Container, Sprite } from "pixi.js";
import { getShipTexture } from "../../assets/loadGameAssets";
import type { ShipSprite } from "../../assets/manifest";
import type { Ship } from "../../simulation/entities";

// Os PNGs dos navios têm a proa para baixo (+y); a entidade usa 0 = +x.
const SPRITE_FORWARD_OFFSET = -Math.PI / 2;

// Balanço no mar (só visual). Duas ondas de períodos diferentes para o
// movimento não parecer um pêndulo perfeito.
const SWAY = {
  /** Jogo lateral (rad) e sua frequência (rad/s). */
  rollAmplitude: 0.035,
  rollFrequency: 1.7,
  /** Arfagem: o casco "respira" no comprimento (fração da escala). */
  pitchAmplitude: 0.018,
  pitchFrequency: 1.1,
  /** Sobe e desce ao longo do eixo do casco (px). */
  heaveAmplitude: 1.5,
  heaveFrequency: 0.8,
  /** Inclinação para fora da curva, por rad/s de giro. */
  turnLean: 0.12,
  /** Suavização da inclinação (1/s). */
  leanResponse: 4,
} as const;

/** Registra uma chamada por quadro do ticker do Pixi; retorna quem a remove. */
export type FrameSubscriber = (
  callback: (deltaMs: number) => void,
) => () => void;

/**
 * Espelho visual de um navio: lê a entidade a cada quadro e não guarda estado
 * de jogo. O balanço no mar roda no ticker do Pixi, separado da simulação.
 */
export class ShipView {
  readonly container = new Container();

  private readonly hull: Sprite;
  private readonly unsubscribe: () => void;
  /** Tempo visual do balanço (s); não interfere na simulação. */
  private swayTime: number;
  private lean = 0;
  private targetLean = 0;

  constructor(sprite: ShipSprite, onFrame: FrameSubscriber, phase = 0) {
    this.hull = new Sprite(getShipTexture(sprite));
    this.hull.anchor.set(0.5);
    this.container.addChild(this.hull);
    this.swayTime = phase;
    this.unsubscribe = onFrame((deltaMs) => this.animate(deltaMs / 1000));
  }

  sync(ship: Ship): void {
    this.container.position.set(ship.x, ship.y);
    this.container.rotation = ship.rotation + SPRITE_FORWARD_OFFSET;
    this.targetLean = -ship.angularVelocity * SWAY.turnLean;
  }

  /** Troca a aparência do casco (estágio de dano). */
  setSprite(sprite: ShipSprite): void {
    const texture = getShipTexture(sprite);
    if (this.hull.texture !== texture) this.hull.texture = texture;
  }

  destroy(): void {
    this.unsubscribe();
    // A textura é compartilhada pelo cache do Assets; só a cena é destruída.
    this.container.destroy({ children: true });
  }

  private animate(dt: number): void {
    this.swayTime += dt;
    const t = this.swayTime;
    this.lean +=
      (this.targetLean - this.lean) * Math.min(1, SWAY.leanResponse * dt);

    this.hull.rotation =
      Math.sin(t * SWAY.rollFrequency) * SWAY.rollAmplitude + this.lean;
    this.hull.scale.set(
      1 - Math.abs(this.lean) * 0.5,
      1 + Math.sin(t * SWAY.pitchFrequency) * SWAY.pitchAmplitude,
    );
    this.hull.y = Math.sin(t * SWAY.heaveFrequency) * SWAY.heaveAmplitude;
  }
}

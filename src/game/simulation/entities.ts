// Entidades são dados puros; sistemas as alteram, views só as leem.
import type { EnemyKind } from "../../config/enemies";

export type { EnemyKind };

export interface Ship {
  readonly id: string;
  x: number;
  y: number;
  /** Direção da proa (rad); 0 aponta para +x. */
  rotation: number;
  /** Velocidade atual ao longo da proa (px/s). */
  speed: number;
  /** Posição e rumo no início do passo: o desenho interpola entre eles e os atuais. */
  prevX: number;
  prevY: number;
  prevRotation: number;
  readonly radius: number;
  /** Vida atual; em 0 o navio está destruído. */
  hp: number;
  readonly maxHp: number;
}

/** Comando de um navio em um passo: vela (0 recolhida … 1 toda aberta) e leme (-1 bombordo … 1 boreste). */
export interface ShipControl {
  throttle: number;
  turn: number;
}

export interface Enemy extends Ship {
  readonly kind: EnemyKind;
  /** Comando decidido pela IA; o movimento só o aplica. */
  readonly control: ShipControl;
  /** Segundos até poder disparar de novo. */
  fireCooldown: number;
}

export interface Projectile {
  readonly id: string;
  readonly owner: "player" | "enemy";
  x: number;
  y: number;
  /** Posição no início do passo, para o desenho interpolar. */
  prevX: number;
  prevY: number;
  readonly vx: number;
  readonly vy: number;
  /** Distância já percorrida (px); some ao passar do alcance. */
  travelled: number;
  /** Alcance da arma que o disparou (px). */
  readonly range: number;
  /** Vida que tira do navio atingido. */
  readonly damage: number;
  readonly radius: number;
}

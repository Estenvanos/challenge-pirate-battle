// Entidades são dados puros; sistemas as alteram, views só as leem.

export interface Ship {
  readonly id: string;
  x: number;
  y: number;
  /** Direção da proa (rad); 0 aponta para +x. */
  rotation: number;
  /** Velocidade atual ao longo da proa (px/s). */
  speed: number;
  /** Velocidade de giro atual (rad/s); positivo = sentido horário. */
  angularVelocity: number;
  readonly radius: number;
}

/** Comando de um navio em um passo: vela aberta e leme (-1 bombordo … 1 boreste). */
export interface ShipControl {
  forward: boolean;
  turn: number;
}

export type EnemyKind = "chaser" | "shooter";

export interface Enemy extends Ship {
  readonly kind: EnemyKind;
  /** Comando decidido pela IA; o movimento só o aplica. */
  readonly control: ShipControl;
  /** Segundos até poder disparar de novo. */
  fireCooldown: number;
}

export interface Projectile {
  readonly id: string;
  x: number;
  y: number;
  readonly vx: number;
  readonly vy: number;
  /** Distância já percorrida (px); some ao passar do alcance. */
  travelled: number;
  readonly radius: number;
}

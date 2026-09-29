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

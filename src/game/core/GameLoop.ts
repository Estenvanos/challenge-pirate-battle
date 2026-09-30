export interface GameLoopConfig {
  readonly stepSec: number;
  readonly maxFrameDeltaSec: number;
}

export interface GameLoopCallbacks {
  /** Um passo fixo da simulação. */
  readonly update: (dt: number) => void;
  /**
   * Desenho, uma vez por quadro, depois dos passos. `alpha` (0–1) é a fração
   * do próximo passo já decorrida, para interpolar do estado anterior ao atual.
   */
  readonly render: (alpha: number) => void;
}

/**
 * Timestep fixo com acumulador: o tempo real do quadro vira N passos de
 * `stepSec`. O delta é limitado para uma travada não gerar uma avalanche.
 */
export class GameLoop {
  private accumulator = 0;

  constructor(
    private readonly config: GameLoopConfig,
    private readonly callbacks: GameLoopCallbacks,
  ) {}

  frame(deltaMs: number): void {
    const { stepSec, maxFrameDeltaSec } = this.config;
    this.accumulator += Math.min(deltaMs / 1000, maxFrameDeltaSec);
    while (this.accumulator >= stepSec) {
      this.callbacks.update(stepSec);
      this.accumulator -= stepSec;
    }
    this.callbacks.render(this.accumulator / stepSec);
  }

  /** Avança `sec` de simulação em passos fixos, sem depender do tempo real (testes). */
  advance(sec: number): void {
    const { stepSec } = this.config;
    const steps = Math.round(sec / stepSec);
    for (let i = 0; i < steps; i++) this.callbacks.update(stepSec);
    this.callbacks.render(this.accumulator / stepSec);
  }
}

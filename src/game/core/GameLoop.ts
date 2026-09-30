export interface GameLoopConfig {
  readonly stepSec: number;
  readonly maxFrameDeltaSec: number;
}

export interface GameLoopCallbacks {
  /** One fixed simulation step. */
  readonly update: (dt: number) => void;
  /** One draw per frame; alpha interpolates between the last two steps. */
  readonly render: (alpha: number) => void;
}

/** Converts frame time into fixed steps and caps long frame stalls. */
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

  /** Runs deterministic simulation steps for tests, independent of wall time. */
  advance(sec: number): void {
    const { stepSec } = this.config;
    const steps = Math.round(sec / stepSec);
    for (let i = 0; i < steps; i++) this.callbacks.update(stepSec);
    this.callbacks.render(this.accumulator / stepSec);
  }
}

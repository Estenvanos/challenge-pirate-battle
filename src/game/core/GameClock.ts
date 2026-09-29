/** Única fonte de tempo da simulação: avança só pelos passos fixos do loop. */
export class GameClock {
  private elapsed = 0;

  get elapsedSec(): number {
    return this.elapsed;
  }

  step(dt: number): void {
    this.elapsed += dt;
  }
}

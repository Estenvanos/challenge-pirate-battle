import { Application, Container, type Ticker } from "pixi.js";

export interface ArenaSize {
  readonly width: number;
  readonly height: number;
}

const KICK_DECAY = 16;

/** Owns the Pixi application and fits the fixed arena into the host. */
export class PixiRenderer {
  readonly world = new Container();

  private app: Application | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;
  private baseX = 0;
  private baseY = 0;
  private kickX = 0;
  private kickY = 0;

  constructor(private readonly arena: ArenaSize) {}

  /** Safe if destroy() is called before the asynchronous Pixi init completes. */
  async init(host: HTMLElement): Promise<void> {
    const app = new Application();
    await app.init({
      resizeTo: host,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      backgroundAlpha: 0,
      antialias: false,
    });
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }
    this.app = app;
    host.appendChild(app.canvas);
    app.stage.addChild(this.world);

    this.resizeObserver = new ResizeObserver(() => {
      app.resize();
      this.fitArena();
    });
    this.resizeObserver.observe(host);
    this.fitArena();

    app.ticker.add((ticker) => {
      if (this.kickX === 0 && this.kickY === 0) return;
      const decay = Math.exp((-KICK_DECAY * ticker.deltaMS) / 1000);
      this.kickX = Math.abs(this.kickX) < 0.01 ? 0 : this.kickX * decay;
      this.kickY = Math.abs(this.kickY) < 0.01 ? 0 : this.kickY * decay;
      this.applyPosition();
    });
  }

  kick(angle: number, amount: number): void {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    this.kickX -= Math.cos(angle) * amount;
    this.kickY -= Math.sin(angle) * amount;
  }

  setMaxFps(fps: number): void {
    if (this.app) this.app.ticker.maxFPS = fps;
  }

  onFrame(callback: (deltaMs: number) => void): () => void {
    const app = this.app;
    if (!app) return () => {};
    const listener = (ticker: Ticker) => callback(ticker.deltaMS);
    app.ticker.add(listener);
    return () => {
      app.ticker.remove(listener);
    };
  }

  /** Maps CSS canvas coordinates into fixed arena coordinates. */
  screenToArena(x: number, y: number): { x: number; y: number } {
    const scale = this.world.scale.x || 1;
    return {
      x: (x - this.world.position.x) / scale,
      y: (y - this.world.position.y) / scale,
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const app = this.app;
    this.app = null;
    if (!app) return;
    app.ticker.stop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    app.stage.destroy({ children: true });
    app.destroy(true);
  }

  private fitArena(): void {
    const app = this.app;
    if (!app) return;
    const { width, height } = app.screen;
    const scale = Math.min(
      width / this.arena.width,
      height / this.arena.height,
    );
    this.world.scale.set(scale);
    this.baseX = (width - this.arena.width * scale) / 2;
    this.baseY = (height - this.arena.height * scale) / 2;
    this.applyPosition();
  }

  private applyPosition(): void {
    const scale = this.world.scale.x;
    this.world.position.set(
      this.baseX + this.kickX * scale,
      this.baseY + this.kickY * scale,
    );
  }
}

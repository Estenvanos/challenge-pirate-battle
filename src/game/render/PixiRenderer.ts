import { Application, Container, type Ticker } from "pixi.js";

export interface ArenaSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Dono da Application do Pixi. Ajusta a arena à área do host mantendo a
 * proporção (letterbox); redimensionar muda só a apresentação.
 */
export class PixiRenderer {
  /** Container em coordenadas da arena; tudo do jogo é desenhado aqui. */
  readonly world = new Container();

  private app: Application | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;

  constructor(private readonly arena: ArenaSize) {}

  async init(host: HTMLElement): Promise<void> {
    const app = new Application();
    await app.init({
      resizeTo: host,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      backgroundAlpha: 0,
      antialias: false,
    });
    // destroy() pode ter sido chamado durante o init assíncrono.
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }
    this.app = app;
    host.appendChild(app.canvas);
    app.stage.addChild(this.world);

    // O resizeTo do Pixi redimensiona o canvas; o observer recalcula o letterbox.
    this.resizeObserver = new ResizeObserver(() => {
      app.resize();
      this.fitArena();
    });
    this.resizeObserver.observe(host);
    this.fitArena();
  }

  /** Registra uma chamada por quadro (delta em ms); retorna a função que a remove. */
  onFrame(callback: (deltaMs: number) => void): () => void {
    const app = this.app;
    if (!app) return () => {};
    const listener = (ticker: Ticker) => callback(ticker.deltaMS);
    app.ticker.add(listener);
    return () => {
      app.ticker.remove(listener);
    };
  }

  /** Converte coordenadas do canvas (px CSS) para coordenadas da arena. */
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
    // Texturas compartilhadas ficam no cache do Assets; só a cena é destruída.
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
    this.world.position.set(
      (width - this.arena.width * scale) / 2,
      (height - this.arena.height * scale) / 2,
    );
  }
}

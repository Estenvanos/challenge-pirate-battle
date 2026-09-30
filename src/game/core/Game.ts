import { createMatchConfig } from "../../config/gameConfig";
import type { GameOptions } from "../../config/options";
import { ARENA_MAP } from "../arena";
import { loadGameAssets } from "../assets/loadGameAssets";
import { InputManager } from "../input/InputManager";
import { PixiRenderer } from "../render/PixiRenderer";
import { EnemiesView } from "../render/views/EnemiesView";
import { ProjectilesView } from "../render/views/ProjectilesView";
import { ShipView } from "../render/views/ShipView";
import { TileMapView } from "../render/views/TileMapView";
import { stepWorld } from "../simulation/stepWorld";
import { createWorld } from "../simulation/World";
import { GameClock } from "./GameClock";
import { GameLoop } from "./GameLoop";

export interface GameInitOptions {
  /** Opções congeladas da partida (tempo de sessão, intervalo de spawn). */
  readonly options: Readonly<GameOptions>;
  /** Seed do RNG da simulação; mesma seed, mesma partida. */
  readonly seed?: number;
  readonly onLoadProgress?: (progress: number) => void;
  /** Mostra os polígonos de colisão das ilhas. */
  readonly debugIslands?: boolean;
}

/**
 * Orquestra o jogo sobre um elemento host: arena, navio do jogador, input e
 * loop de timestep fixo, inimigos (spawn, IA, tiro). Dano e áudio entram nas próximas etapas.
 */
export class Game {
  private renderer: PixiRenderer | null = null;
  private mapView: TileMapView | null = null;
  private shipView: ShipView | null = null;
  private enemiesView: EnemiesView | null = null;
  private projectilesView: ProjectilesView | null = null;
  private input: InputManager | null = null;
  private stopLoop: (() => void) | null = null;
  private destroyed = false;
  private paused = false;

  /**
   * Congela simulação, relógio e animações. O momentum fica no World, então
   * retomar continua de onde parou. Pode ser chamado antes do fim do init.
   */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!this.input) return;
    // Limpa na pausa e na retomada: nada acumula do período pausado.
    this.input.clear();
    this.input.enabled = !paused;
  }

  /** Rejeita se os assets falharem; seguro de chamar destroy() a qualquer momento. */
  async init(host: HTMLElement, options: GameInitOptions): Promise<void> {
    await loadGameAssets(options.onLoadProgress);
    if (this.destroyed) return;

    const renderer = new PixiRenderer(ARENA_MAP);
    this.renderer = renderer;
    await renderer.init(host);
    if (this.destroyed) return;

    this.mapView = new TileMapView(ARENA_MAP, {
      debugIslands: options.debugIslands,
    });
    renderer.world.addChild(this.mapView.container);

    // Snapshot congelado da config: mudanças posteriores só valem na próxima partida.
    const config = createMatchConfig(options.options);
    // O Game não é simulação: aqui pode usar o relógio para sortear a seed.
    const world = createWorld(ARENA_MAP, config, options.seed ?? Date.now());
    const clock = new GameClock();
    const input = new InputManager();
    input.enabled = !this.paused;
    this.input = input;
    // Pausado, nenhum quadro chega ao loop nem às animações das views.
    const onFrame = (callback: (deltaMs: number) => void) =>
      renderer.onFrame((deltaMs) => {
        if (!this.paused) callback(deltaMs);
      });
    const enemiesView = new EnemiesView(onFrame);
    this.enemiesView = enemiesView;
    const shipView = new ShipView("ship_2", onFrame);
    this.shipView = shipView;
    const projectilesView = new ProjectilesView();
    this.projectilesView = projectilesView;
    renderer.world.addChild(
      enemiesView.container,
      shipView.container,
      projectilesView.container,
    );

    const loop = new GameLoop(config.loop, {
      update: (dt) => {
        clock.step(dt);
        stepWorld(world, input.actions, dt, config);
      },
      render: () => {
        shipView.sync(world.player);
        enemiesView.sync(world.enemies);
        projectilesView.sync(world.projectiles);
      },
    });
    shipView.sync(world.player);
    this.stopLoop = onFrame((deltaMs) => loop.frame(deltaMs));
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopLoop?.();
    this.stopLoop = null;
    this.input?.destroy();
    this.input = null;
    this.shipView?.destroy();
    this.shipView = null;
    this.enemiesView?.destroy();
    this.enemiesView = null;
    this.projectilesView?.destroy();
    this.projectilesView = null;
    this.mapView?.destroy();
    this.mapView = null;
    this.renderer?.destroy();
    this.renderer = null;
  }
}

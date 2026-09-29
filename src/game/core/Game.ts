import { GAME_CONFIG } from "../../config/gameConfig";
import { ARENA_MAP } from "../arena";
import { loadGameAssets } from "../assets/loadGameAssets";
import { InputManager } from "../input/InputManager";
import { PixiRenderer } from "../render/PixiRenderer";
import { ShipView } from "../render/views/ShipView";
import { TileMapView } from "../render/views/TileMapView";
import { collisionSystem } from "../simulation/systems/collisionSystem";
import { movementSystem } from "../simulation/systems/movementSystem";
import { createWorld } from "../simulation/World";
import { GameClock } from "./GameClock";
import { GameLoop } from "./GameLoop";

export interface GameInitOptions {
  readonly onLoadProgress?: (progress: number) => void;
  /** Mostra os polígonos de colisão das ilhas. */
  readonly debugIslands?: boolean;
}

/**
 * Orquestra o jogo sobre um elemento host: arena, navio do jogador, input e
 * loop de timestep fixo. Combate, inimigos e áudio entram nas próximas etapas.
 */
export class Game {
  private renderer: PixiRenderer | null = null;
  private mapView: TileMapView | null = null;
  private shipView: ShipView | null = null;
  private input: InputManager | null = null;
  private stopLoop: (() => void) | null = null;
  private destroyed = false;

  /** Rejeita se os assets falharem; seguro de chamar destroy() a qualquer momento. */
  async init(host: HTMLElement, options: GameInitOptions = {}): Promise<void> {
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
    const config = GAME_CONFIG;
    const world = createWorld(ARENA_MAP, config);
    const clock = new GameClock();
    const input = new InputManager();
    this.input = input;
    const shipView = new ShipView("ship_2", (callback) =>
      renderer.onFrame(callback),
    );
    this.shipView = shipView;
    renderer.world.addChild(shipView.container);

    const loop = new GameLoop(config.loop, {
      update: (dt) => {
        clock.step(dt);
        movementSystem(world, input.actions, dt, config);
        collisionSystem(world);
      },
      render: () => shipView.sync(world.player),
    });
    shipView.sync(world.player);
    this.stopLoop = renderer.onFrame((deltaMs) => loop.frame(deltaMs));
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
    this.mapView?.destroy();
    this.mapView = null;
    this.renderer?.destroy();
    this.renderer = null;
  }
}

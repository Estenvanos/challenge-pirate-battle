import { Container } from "pixi.js";
import { createMatchConfig } from "../../config/gameConfig";
import type { GameOptions } from "../../config/options";
import { ARENA_MAP } from "../arena";
import { loadGameAssets } from "../assets/loadGameAssets";
import { SoundManager } from "../audio/SoundManager";
import { InputManager } from "../input/InputManager";
import {
  createFxTextures,
  type FxTextures,
} from "../render/effects/fxTextures";
import { PixiRenderer } from "../render/PixiRenderer";
import { EffectsView } from "../render/views/EffectsView";
import { EnemiesView } from "../render/views/EnemiesView";
import { ProjectilesView } from "../render/views/ProjectilesView";
import { ShipView } from "../render/views/ShipView";
import { TileMapView } from "../render/views/TileMapView";
import { stepWorld } from "../simulation/stepWorld";
import { createWorld, type WorldEvent } from "../simulation/World";
import { GameClock } from "./GameClock";
import { GameLoop } from "./GameLoop";

// Reação visual ao tiro (px da arena): recuo do navio e tranco da tela.
const RECOIL = {
  front: { ship: 2.5, screen: 1.5 },
  side: { ship: 4, screen: 3.5 },
} as const;

// Espuma que a popa de cada navio em movimento deixa na água.
const FOAM = { intervalSec: 0.07, minSpeed: 25, behindRadii: 1.8 } as const;

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
 * loop de timestep fixo, inimigos (spawn, IA, tiro), sons de disparo e
 * efeitos visuais. Dano entra nas próximas etapas.
 */
export class Game {
  private renderer: PixiRenderer | null = null;
  private mapView: TileMapView | null = null;
  private shipView: ShipView | null = null;
  private enemiesView: EnemiesView | null = null;
  private projectilesView: ProjectilesView | null = null;
  private effects: EffectsView | null = null;
  private fxTextures: FxTextures | null = null;
  private input: InputManager | null = null;
  private sounds: SoundManager | null = null;
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

    // Snapshot congelado da config: mudanças posteriores só valem na próxima partida.
    const config = createMatchConfig(options.options);
    // O Game não é simulação: aqui pode usar o relógio para sortear a seed.
    const world = createWorld(ARENA_MAP, config, options.seed ?? Date.now());
    const clock = new GameClock();
    const input = new InputManager();
    input.enabled = !this.paused;
    this.input = input;
    const sounds = new SoundManager();
    this.sounds = sounds;
    // Pausado, nenhum quadro chega ao loop nem às animações das views.
    const onFrame = (callback: (deltaMs: number) => void) =>
      renderer.onFrame((deltaMs) => {
        if (!this.paused) callback(deltaMs);
      });

    const mapView = new TileMapView(ARENA_MAP, {
      debugIslands: options.debugIslands,
    });
    this.mapView = mapView;
    const fxTextures = createFxTextures();
    this.fxTextures = fxTextures;
    const effects = new EffectsView(fxTextures);
    this.effects = effects;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Esteiras e sombras ficam abaixo de todos os cascos.
    const layers = {
      wakes: new Container(),
      shadows: new Container(),
      hulls: new Container(),
    };
    const enemiesView = new EnemiesView(layers, fxTextures.wake, reducedMotion);
    this.enemiesView = enemiesView;
    const shipView = new ShipView(layers, {
      sprite: "ship_2",
      scale: config.player.spriteScale,
      wakeTexture: fxTextures.wake,
      reducedMotion,
    });
    this.shipView = shipView;
    const projectilesView = new ProjectilesView(fxTextures);
    this.projectilesView = projectilesView;
    renderer.world.addChild(
      mapView.container,
      layers.wakes,
      effects.under,
      layers.shadows,
      layers.hulls,
      projectilesView.container,
      effects.over,
    );

    const onEvent = (event: WorldEvent) => {
      switch (event.type) {
        case "shotFired": {
          const side = event.weapon === "side";
          sounds.play(side ? "cannonBroadside" : "cannonFire");
          effects.muzzle(event.x, event.y, event.angle, event.shots);
          const { ship, screen } = side ? RECOIL.side : RECOIL.front;
          if (event.shipId === world.player.id) {
            shipView.recoil(event.angle, ship);
            renderer.kick(event.angle, screen);
          } else {
            enemiesView.get(event.shipId)?.recoil(event.angle, ship);
          }
          break;
        }
        case "projectileEnded":
          if (event.cause === "range") effects.splash(event.x, event.y);
          else if (event.cause === "island") effects.dust(event.x, event.y);
          break;
        case "enemySpawned":
          effects.ripple(event.x, event.y);
          break;
      }
    };

    /** Tempo do quadro atual (s), para as animações das views. */
    let frameDt = 0;
    let foamClock = 0;
    const loop = new GameLoop(config.loop, {
      update: (dt) => {
        clock.step(dt);
        stepWorld(world, input.actions, dt, config);
        world.events.forEach(onEvent);
        world.events.length = 0;
      },
      render: (alpha) => {
        mapView.update(frameDt);
        shipView.sync(world.player, alpha, frameDt, config.player.maxSpeed);
        enemiesView.sync(world.enemies, alpha, frameDt);
        projectilesView.sync(world.projectiles, alpha);

        foamClock += frameDt;
        if (foamClock >= FOAM.intervalSec) {
          foamClock = 0;
          for (const ship of [world.player, ...world.enemies]) {
            if (ship.speed < FOAM.minSpeed) continue;
            // Logo atrás da popa: o casco tem ~1,5 raio de meio comprimento.
            const behind = ship.radius * FOAM.behindRadii;
            effects.foam(
              ship.x - Math.cos(ship.rotation) * behind,
              ship.y - Math.sin(ship.rotation) * behind,
              ship.rotation,
            );
          }
        }
        effects.update(frameDt);
      },
    });
    shipView.sync(world.player, 1, 0, config.player.maxSpeed);
    this.stopLoop = onFrame((deltaMs) => {
      frameDt = deltaMs / 1000;
      loop.frame(deltaMs);
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopLoop?.();
    this.stopLoop = null;
    this.input?.destroy();
    this.input = null;
    this.sounds?.destroy();
    this.sounds = null;
    this.shipView?.destroy();
    this.shipView = null;
    this.enemiesView?.destroy();
    this.enemiesView = null;
    this.projectilesView?.destroy();
    this.projectilesView = null;
    this.effects?.destroy();
    this.effects = null;
    this.mapView?.destroy();
    this.mapView = null;
    this.renderer?.destroy();
    this.renderer = null;
    // Por último: a cena que usava estas texturas já foi destruída.
    this.fxTextures?.destroy();
    this.fxTextures = null;
  }
}

import { Container } from "pixi.js";
import { createMatchConfig } from "../../config/gameConfig";
import type { GameOptions } from "../../config/options";
import { ARENA_MAP } from "../arena";
import { loadGameAssets } from "../assets/loadGameAssets";
import { SoundManager } from "../audio/SoundManager";
import type { Action } from "../input/actions";
import { InputManager } from "../input/InputManager";
import { angleTo } from "../physics/vector";
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
import {
  createWorld,
  type EndReason,
  type World,
  type WorldEvent,
} from "../simulation/World";
import { GameClock } from "./GameClock";
import { GameLoop } from "./GameLoop";

// Reação visual ao tiro (px da arena): recuo do navio e tranco da tela.
const RECOIL = {
  front: { ship: 2.5, screen: 1.5 },
  side: { ship: 4, screen: 3.5 },
} as const;

/** Tranco da tela (px da arena) quando o jogador leva dano e quando é destruído. */
const HIT_KICK = { damaged: 4, destroyed: 9 } as const;

// Fumaça de casco danificado: leve a partir de `light` da vida, pesada (com
// chamas) a partir de `heavy`.
const SMOKE = { intervalSec: 0.16, light: 2 / 3, heavy: 1 / 3 } as const;

// Espuma que a popa de cada navio em movimento deixa na água.
const FOAM = { intervalSec: 0.07, minSpeed: 25, behindRadii: 1.8 } as const;

/** Quadros por segundo com o relógio manual dos testes. */
const MANUAL_CLOCK_FPS = 1;
/** Tempo entre o fim da partida e o aviso à UI (s): deixa a explosão aparecer. */
const RESULT_DELAY_SEC = 1;

/** Resultado de uma partida concluída. */
export interface MatchResult {
  readonly score: number;
  /** Tempo de jogo ativo (s). */
  readonly durationSec: number;
  readonly endReason: EndReason;
}

export interface CooldownRatios {
  front: number;
  left: number;
  right: number;
}

export interface GameInitOptions {
  /** Opções congeladas da partida (tempo de sessão, intervalo de spawn). */
  readonly options: Readonly<GameOptions>;
  /** Seed do RNG da simulação; mesma seed, mesma partida. */
  readonly seed?: number;
  readonly onLoadProgress?: (progress: number) => void;
  /** Vida do jogador: no início da partida e a cada dano sofrido. */
  readonly onPlayerHealth?: (hp: number, maxHp: number) => void;
  /** Pontuação: a cada inimigo destruído pelo jogador. */
  readonly onScore?: (score: number) => void;
  /** Tempo restante em segundos inteiros: no início e a cada segundo que passa. */
  readonly onTimeLeft?: (timeLeftSec: number) => void;
  /** Fim da partida (tempo esgotado ou jogador destruído); chamado uma vez. */
  readonly onMatchEnd?: (result: MatchResult) => void;
  /** Cooldown restante de cada arma do jogador (1 = acabou de atirar, 0 = pronta); só chama quando muda. */
  readonly onCooldowns?: (ratios: Readonly<CooldownRatios>) => void;
  /** Mostra os polígonos de colisão das ilhas. */
  readonly debugIslands?: boolean;
  /**
   * Testes: o tempo real não move a simulação; só `advance()` a faz andar.
   * O desenho continua a cada quadro.
   */
  readonly manualClock?: boolean;
}

/**
 * Orquestra o jogo sobre um elemento host: arena, navio do jogador, input e
 * loop de timestep fixo, inimigos (spawn, IA, tiro), dano, sons e efeitos
 * visuais.
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
  private loop: GameLoop | null = null;
  private world: World | null = null;
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

  /** Testes (relógio manual): avança `sec` de jogo ativo. Pausado, não anda. */
  advance(sec: number): void {
    if (this.paused || this.destroyed) return;
    this.loop?.advance(sec);
  }

  /** Testes: estado da partida, só para leitura. */
  get state(): Readonly<World> | null {
    return this.world;
  }

  /** Controles de toque: pressiona ou solta uma ação, como o teclado faria. */
  setAction(action: Action, pressed: boolean): void {
    this.input?.setAction(action, pressed);
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
    options.onPlayerHealth?.(world.player.hp, world.player.maxHp);
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
    // Esteiras e sombras ficam abaixo de todos os cascos; as barras de vida,
    // acima de tudo.
    const layers = {
      wakes: new Container(),
      shadows: new Container(),
      hulls: new Container(),
      bars: new Container(),
    };
    const enemiesView = new EnemiesView(layers, fxTextures.wake, reducedMotion);
    this.enemiesView = enemiesView;
    const shipView = new ShipView(layers, {
      sprites: config.player.sprites,
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
      layers.bars,
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
        case "shipDamaged": {
          const { player } = world;
          sounds.play("woodHit");
          effects.hit(event.x, event.y);
          if (event.shipId === player.id) {
            shipView.flash();
            renderer.kick(angleTo(player, event), HIT_KICK.damaged);
            options.onPlayerHealth?.(player.hp, player.maxHp);
          } else {
            enemiesView.get(event.shipId)?.flash();
          }
          break;
        }
        case "enemyDestroyed":
          sounds.play("shipExplosion");
          effects.explosion(event.x, event.y);
          effects.crew(event.x, event.y);
          if (event.cause === "shot") options.onScore?.(world.score);
          break;
        case "playerRepaired":
          shipView.heal();
          options.onPlayerHealth?.(world.player.hp, world.player.maxHp);
          break;
        case "playerDestroyed":
          sounds.play("shipExplosion");
          sounds.play("shipSinking");
          sounds.play("gameOver");
          effects.explosion(event.x, event.y);
          effects.crew(event.x, event.y);
          renderer.kick(world.player.rotation, HIT_KICK.destroyed);
          break;
      }
    };

    /** Tempo do quadro atual (s), para as animações das views. */
    let frameDt = 0;
    let foamClock = 0;
    let smokeClock = 0;
    const cooldownRatios: CooldownRatios = { front: 0, left: 0, right: 0 };
    const { front: frontWeapon, side: sideWeapon } = config.player.weapons;
    let timeLeftSec = config.sessionTimeSec;
    options.onTimeLeft?.(timeLeftSec);
    /** Segundos até avisar a UI do fim; `null` depois de avisada. */
    let resultDelay: number | null = RESULT_DELAY_SEC;
    const loop = new GameLoop(config.loop, {
      update: (dt) => {
        clock.step(dt);
        const running = !world.endReason;
        stepWorld(world, input.actions, dt, config);
        world.events.forEach(onEvent);
        world.events.length = 0;

        const left = Math.ceil(config.sessionTimeSec - world.elapsedSec);
        if (left !== timeLeftSec) {
          timeLeftSec = left;
          options.onTimeLeft?.(left);
        }
        if (running && world.endReason === "timeUp") {
          sounds.play("gameComplete");
        }
        if (world.endReason && resultDelay !== null) {
          resultDelay -= dt;
          if (resultDelay <= 0) {
            resultDelay = null;
            options.onMatchEnd?.({
              score: world.score,
              durationSec: world.elapsedSec,
              endReason: world.endReason,
            });
          }
        }
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
        smokeClock += frameDt;
        if (smokeClock >= SMOKE.intervalSec) {
          smokeClock = 0;
          for (const ship of [world.player, ...world.enemies]) {
            const ratio = ship.hp / ship.maxHp;
            if (ratio <= 0 || ratio > SMOKE.light) continue;
            effects.smoke(ship.x, ship.y, ratio <= SMOKE.heavy);
          }
        }
        effects.update(frameDt);

        if (options.onCooldowns) {
          const { front, left, right } = world.playerCooldowns;
          const next = {
            front: front / frontWeapon.cooldownSec,
            left: left / sideWeapon.cooldownSec,
            right: right / sideWeapon.cooldownSec,
          };
          if (
            next.front !== cooldownRatios.front ||
            next.left !== cooldownRatios.left ||
            next.right !== cooldownRatios.right
          ) {
            Object.assign(cooldownRatios, next);
            options.onCooldowns(cooldownRatios);
          }
        }
      },
    });
    shipView.sync(world.player, 1, 0, config.player.maxSpeed);
    this.loop = loop;
    this.world = world;
    // Relógio manual (testes): a cena só muda no advance(); um quadro por
    // segundo basta e deixa a página livre para o Playwright.
    if (options.manualClock) renderer.setMaxFps(MANUAL_CLOCK_FPS);
    this.stopLoop = onFrame((deltaMs) => {
      // Relógio manual: nem a simulação nem as animações andam sozinhas.
      frameDt = options.manualClock ? 0 : deltaMs / 1000;
      loop.frame(options.manualClock ? 0 : deltaMs);
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopLoop?.();
    this.stopLoop = null;
    this.loop = null;
    this.world = null;
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

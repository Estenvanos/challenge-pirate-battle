import { createMatchConfig } from "../../config/gameConfig";
import type { GameOptions } from "../../config/options";
import { ARENA_MAP } from "../arena";
import { loadGameAssets } from "../assets/loadGameAssets";
import type { Action } from "../input/actions";
import { InputManager } from "../input/InputManager";
import { PixiRenderer } from "../render/PixiRenderer";
import { stepWorld } from "../simulation/stepWorld";
import {
  createWorld,
  type EndReason,
  type World,
  type WorldEvent,
} from "../simulation/World";
import { GameLoop } from "./GameLoop";
import { GamePresentation } from "./GamePresentation";

/** Frame cap while tests advance the simulation manually. */
const MANUAL_CLOCK_FPS = 1;
/** Wait for the final explosion before opening the result dialog. */
const RESULT_DELAY_SEC = 1;

/** Result of a completed match. */
export interface MatchResult {
  readonly score: number;
  /** Active play time in seconds. */
  readonly durationSec: number;
  readonly endReason: EndReason;
}

export interface CooldownRatios {
  front: number;
  left: number;
  right: number;
}

export interface GameInitOptions {
  /** Session time and spawn interval captured when the match starts. */
  readonly options: Readonly<GameOptions>;
  /** Same seed yields the same simulation. */
  readonly seed?: number;
  readonly onLoadProgress?: (progress: number) => void;
  /** Player health at match start and after damage or repair. */
  readonly onPlayerHealth?: (hp: number, maxHp: number) => void;
  /** Score after each enemy destroyed by the player. */
  readonly onScore?: (score: number) => void;
  /** Whole seconds remaining, emitted at start and on change. */
  readonly onTimeLeft?: (timeLeftSec: number) => void;
  /** Called once after time runs out or the player is destroyed. */
  readonly onMatchEnd?: (result: MatchResult) => void;
  /** Remaining weapon cooldown: 1 just fired, 0 ready; emitted on change. */
  readonly onCooldowns?: (ratios: Readonly<CooldownRatios>) => void;
  /** Checked before each sound; never muted when omitted. */
  readonly isMuted?: () => boolean;
  /** Draw island collision polygons. */
  readonly debugIslands?: boolean;
  /**
   * Tests advance the simulation with advance() instead of real time.
   * Rendering still receives frame callbacks.
   */
  readonly manualClock?: boolean;
}

/** Coordinates match initialization, input, fixed-step simulation and cleanup. */
export class Game {
  private renderer: PixiRenderer | null = null;
  private presentation: GamePresentation | null = null;
  private input: InputManager | null = null;
  private stopLoop: (() => void) | null = null;
  private loop: GameLoop | null = null;
  private world: World | null = null;
  private destroyed = false;
  private paused = false;

  /** Freezes simulation and animation; safe before initialization completes. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!this.input) return;
    // Clear input both ways so paused key presses cannot accumulate.
    this.input.clear();
    this.input.enabled = !paused && !this.world?.endReason;
  }

  /** Advances active play time with the manual test clock. */
  advance(sec: number): void {
    if (this.paused || this.destroyed) return;
    this.loop?.advance(sec);
  }

  /** Read-only match state for tests. */
  get state(): Readonly<World> | null {
    return this.world;
  }

  /** Applies a touch action through the same input state as the keyboard. */
  setAction(action: Action, pressed: boolean): void {
    this.input?.setAction(action, pressed);
  }

  /** Rejects on asset failure; destroy() is safe throughout initialization. */
  async init(host: HTMLElement, options: GameInitOptions): Promise<void> {
    await loadGameAssets(options.onLoadProgress);
    if (this.destroyed) return;

    const renderer = new PixiRenderer(ARENA_MAP);
    this.renderer = renderer;
    await renderer.init(host);
    if (this.destroyed) return;

    // Later option changes apply only to the next match.
    const config = createMatchConfig(options.options);
    // The wall clock only chooses a seed outside the deterministic simulation.
    const world = createWorld(ARENA_MAP, config, options.seed ?? Date.now());
    options.onPlayerHealth?.(world.player.hp, world.player.maxHp);
    const input = new InputManager();
    input.enabled = !this.paused;
    this.input = input;
    // Drop paused frames so neither the accumulator nor animations advance.
    const onFrame = (callback: (deltaMs: number) => void) =>
      renderer.onFrame((deltaMs) => {
        if (!this.paused) callback(deltaMs);
      });

    const presentation = new GamePresentation(
      renderer,
      config,
      options.isMuted ?? (() => false),
      options.debugIslands,
    );
    this.presentation = presentation;
    const onEvent = (event: WorldEvent) => {
      presentation.handleEvent(event, world);
      if (event.type === "shipDamaged" && event.shipId === world.player.id) {
        options.onPlayerHealth?.(world.player.hp, world.player.maxHp);
      } else if (event.type === "playerRepaired") {
        options.onPlayerHealth?.(world.player.hp, world.player.maxHp);
      } else if (event.type === "enemyDestroyed" && event.cause === "shot") {
        options.onScore?.(world.score);
      }
    };

    // Seconds in the current frame, used only for view animations.
    let frameDt = 0;
    const cooldownRatios: CooldownRatios = { front: 0, left: 0, right: 0 };
    const { front: frontWeapon, side: sideWeapon } = config.player.weapons;
    let timeLeftSec = config.sessionTimeSec;
    options.onTimeLeft?.(timeLeftSec);
    // Seconds until the result is sent to the UI; null after notification.
    let resultDelay: number | null = RESULT_DELAY_SEC;
    const loop = new GameLoop(config.loop, {
      update: (dt) => {
        const running = !world.endReason;
        stepWorld(world, input.actions, dt, config);
        world.events.forEach(onEvent);
        world.events.length = 0;

        const left = Math.ceil(config.sessionTimeSec - world.elapsedSec);
        if (left !== timeLeftSec) {
          timeLeftSec = left;
          options.onTimeLeft?.(left);
        }
        if (running && world.endReason) {
          // Gameplay is over: release game keys for the result dialog.
          input.enabled = false;
          input.clear();
          if (world.endReason === "timeUp") presentation.playGameComplete();
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
        presentation.render(world, alpha, frameDt);

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
    presentation.syncPlayer(world.player);
    this.loop = loop;
    this.world = world;
    // Manual clock: one frame per second keeps the page free for Playwright.
    if (options.manualClock) renderer.setMaxFps(MANUAL_CLOCK_FPS);
    this.stopLoop = onFrame((deltaMs) => {
      // Real frames do not advance the simulation or animations in test mode.
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
    this.presentation?.destroy();
    this.presentation = null;
    this.renderer?.destroy();
    this.renderer = null;
  }
}

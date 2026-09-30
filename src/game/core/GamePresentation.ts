import { Container } from "pixi.js";
import type { MatchConfig } from "../../config/gameConfig";
import { ARENA_MAP } from "../arena";
import { SoundManager } from "../audio/SoundManager";
import { angleTo } from "../physics/vector";
import { createFxTextures } from "../render/effects/fxTextures";
import type { PixiRenderer } from "../render/PixiRenderer";
import { EffectsView } from "../render/views/EffectsView";
import { EnemiesView } from "../render/views/EnemiesView";
import { ProjectilesView } from "../render/views/ProjectilesView";
import { ShipView } from "../render/views/ShipView";
import { TileMapView } from "../render/views/TileMapView";
import type { Ship } from "../simulation/entities";
import type { World, WorldEvent } from "../simulation/World";

// Arena-space recoil after a shot, applied to the ship and the camera.
const RECOIL = {
  front: { ship: 2.5, screen: 1.5 },
  side: { ship: 4, screen: 3.5 },
} as const;

const HIT_KICK = { damaged: 4, destroyed: 9 } as const;
const SMOKE = { intervalSec: 0.16, light: 2 / 3, heavy: 1 / 3 } as const;
const FOAM = { intervalSec: 0.07, minSpeed: 25, behindRadii: 1.8 } as const;

/** Owns the match's visual and audio feedback; the simulation remains in World. */
export class GamePresentation {
  private readonly mapView: TileMapView;
  private readonly shipView: ShipView;
  private readonly enemiesView: EnemiesView;
  private readonly projectilesView: ProjectilesView;
  private readonly effects: EffectsView;
  private readonly fxTextures = createFxTextures();
  private readonly sounds = new SoundManager();
  private foamClock = 0;
  private smokeClock = 0;

  constructor(
    private readonly renderer: PixiRenderer,
    private readonly config: MatchConfig,
    debugIslands?: boolean,
  ) {
    this.mapView = new TileMapView(ARENA_MAP, { debugIslands });
    this.effects = new EffectsView(this.fxTextures);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Wakes and shadows sit beneath every hull; health bars sit above all ships.
    const layers = {
      wakes: new Container(),
      shadows: new Container(),
      hulls: new Container(),
      bars: new Container(),
    };
    this.enemiesView = new EnemiesView(
      layers,
      this.fxTextures.wake,
      reducedMotion,
    );
    this.shipView = new ShipView(layers, {
      sprites: config.player.sprites,
      scale: config.player.spriteScale,
      wakeTexture: this.fxTextures.wake,
      reducedMotion,
    });
    this.projectilesView = new ProjectilesView(this.fxTextures);
    renderer.world.addChild(
      this.mapView.container,
      layers.wakes,
      this.effects.under,
      layers.shadows,
      layers.hulls,
      this.projectilesView.container,
      this.effects.over,
      layers.bars,
    );
  }

  syncPlayer(player: Ship): void {
    this.shipView.sync(player, 1, 0, this.config.player.maxSpeed);
  }

  handleEvent(event: WorldEvent, world: World): void {
    const { effects, sounds, renderer, shipView, enemiesView } = this;
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
        } else {
          enemiesView.get(event.shipId)?.flash();
        }
        break;
      }
      case "enemyDestroyed":
        sounds.play("shipExplosion");
        effects.explosion(event.x, event.y);
        effects.crew(event.x, event.y);
        break;
      case "playerRepaired":
        shipView.heal();
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
  }

  playGameComplete(): void {
    this.sounds.play("gameComplete");
  }

  render(world: World, alpha: number, frameDt: number): void {
    this.mapView.update(frameDt);
    this.shipView.sync(
      world.player,
      alpha,
      frameDt,
      this.config.player.maxSpeed,
    );
    this.enemiesView.sync(world.enemies, alpha, frameDt);
    this.projectilesView.sync(world.projectiles, alpha);

    this.foamClock += frameDt;
    if (this.foamClock >= FOAM.intervalSec) {
      this.foamClock = 0;
      for (const ship of [world.player, ...world.enemies]) {
        if (ship.speed < FOAM.minSpeed) continue;
        // Emit foam behind the stern, outside the hull.
        const behind = ship.radius * FOAM.behindRadii;
        this.effects.foam(
          ship.x - Math.cos(ship.rotation) * behind,
          ship.y - Math.sin(ship.rotation) * behind,
          ship.rotation,
        );
      }
    }
    this.smokeClock += frameDt;
    if (this.smokeClock >= SMOKE.intervalSec) {
      this.smokeClock = 0;
      for (const ship of [world.player, ...world.enemies]) {
        const ratio = ship.hp / ship.maxHp;
        if (ratio <= 0 || ratio > SMOKE.light) continue;
        this.effects.smoke(ship.x, ship.y, ratio <= SMOKE.heavy);
      }
    }
    this.effects.update(frameDt);
  }

  destroy(): void {
    this.sounds.destroy();
    this.shipView.destroy();
    this.enemiesView.destroy();
    this.projectilesView.destroy();
    this.effects.destroy();
    this.mapView.destroy();
    // All views using the generated textures have been released.
    this.fxTextures.destroy();
  }
}

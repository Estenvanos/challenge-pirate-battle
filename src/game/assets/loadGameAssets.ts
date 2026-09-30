import { Assets, type Texture } from "pixi.js";
import {
  buildManifestBundles,
  CANNON_BALL,
  CREW_SPRITES,
  EFFECTS_BUNDLE,
  HEALTH_BAR,
  HUD_BUNDLE,
  MUZZLE_FLASH,
  SHIPS_BUNDLE,
  tileAlias,
  TILES_BUNDLE,
  type EffectSprite,
  type ShipSprite,
} from "./manifest";

let bundlesRegistered = false;

function registerBundles() {
  if (bundlesRegistered) return;
  for (const bundle of buildManifestBundles()) {
    Assets.addBundle(bundle.name, bundle.assets);
  }
  bundlesRegistered = true;
}

/** Loads cached bundles before combat and surfaces failure for UI retry. */
export async function loadGameAssets(onProgress?: (progress: number) => void) {
  registerBundles();
  await Assets.loadBundle(
    [TILES_BUNDLE, SHIPS_BUNDLE, EFFECTS_BUNDLE, HUD_BUNDLE],
    onProgress,
  );
}

export function getTileTexture(tile: number): Texture {
  const texture = Assets.get<Texture>(tileAlias(tile));
  if (!texture) throw new Error(`Tile texture ${tile} is not loaded`);
  return texture;
}

export function getShipTexture(ship: ShipSprite): Texture {
  const texture = Assets.get<Texture>(ship);
  if (!texture) throw new Error(`Ship texture ${ship} is not loaded`);
  return texture;
}

export function getCannonBallTexture(): Texture {
  const texture = Assets.get<Texture>(CANNON_BALL);
  if (!texture) throw new Error("Cannon ball texture is not loaded");
  return texture;
}

export function getEffectTexture(effect: EffectSprite): Texture {
  const texture = Assets.get<Texture>(effect);
  if (!texture) throw new Error(`Effect texture ${effect} is not loaded`);
  return texture;
}

export const getMuzzleFlashTexture = () => getEffectTexture(MUZZLE_FLASH);

export function getHealthBarTextures() {
  const [frame, green, red] = [
    HEALTH_BAR.frame,
    HEALTH_BAR.green,
    HEALTH_BAR.red,
  ].map((alias) => {
    const texture = Assets.get<Texture>(alias);
    if (!texture) throw new Error(`Health bar texture ${alias} is not loaded`);
    return texture;
  });
  return { frame, green, red };
}

export function getCrewTextures(): Texture[] {
  return CREW_SPRITES.map((crew) => {
    const texture = Assets.get<Texture>(crew);
    if (!texture) throw new Error(`Crew texture ${crew} is not loaded`);
    return texture;
  });
}

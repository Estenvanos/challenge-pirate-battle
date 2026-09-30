import { Assets, type Texture } from "pixi.js";
import {
  buildManifestBundles,
  CANNON_BALL,
  SHIPS_BUNDLE,
  tileAlias,
  TILES_BUNDLE,
  type ShipSprite,
} from "./manifest";

let bundlesRegistered = false;

function registerBundles() {
  if (bundlesRegistered) return;
  for (const bundle of buildManifestBundles(window.devicePixelRatio || 1)) {
    Assets.addBundle(bundle.name, bundle.assets);
  }
  bundlesRegistered = true;
}

/**
 * Carrega os assets do jogo antes do combate. Rejeita em caso de erro para que
 * quem chamou possa oferecer "tentar de novo"; cargas repetidas usam o cache.
 */
export async function loadGameAssets(onProgress?: (progress: number) => void) {
  registerBundles();
  await Assets.loadBundle([TILES_BUNDLE, SHIPS_BUNDLE], onProgress);
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

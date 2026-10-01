import { Container, Graphics, Sprite, TilingSprite } from "pixi.js";
import type { GroundTile, TileMap } from "../../arena";
import { getTileTexture } from "../../assets/loadGameAssets";

const MARGIN_TILES = 6;

const WATER_DRIFT = { x: 7, y: 3.5 } as const;

const SHALLOW_ALPHA = 0.9;

export interface TileMapViewOptions {
  readonly debugIslands?: boolean;
}

/** Builds static map layers once; only water motion changes per frame. */
export class TileMapView {
  readonly container = new Container();

  private readonly water: TilingSprite;
  private time = 0;

  constructor(map: TileMap, options: TileMapViewOptions = {}) {
    const { tileSize } = map;
    const margin = MARGIN_TILES * tileSize;

    const waterTexture = getTileTexture(map.waterTile);
    waterTexture.source.style.addressMode = "repeat";
    const water = new TilingSprite({
      texture: waterTexture,
      width: map.width + margin * 2,
      height: map.height + margin * 2,
    });
    water.position.set(-margin, -margin);
    this.container.addChild(water);
    this.water = water;

    const shallows = new Container();
    shallows.alpha = SHALLOW_ALPHA;
    const land = new Container();
    this.container.addChild(shallows, land);

    const place = (
      parent: Container,
      col: number,
      row: number,
      { tile, flipX, flipY, rotation }: GroundTile,
    ) => {
      const sprite = new Sprite(getTileTexture(tile));
      sprite.anchor.set(0.5);
      sprite.scale.set(flipX ? -1 : 1, flipY ? -1 : 1);
      sprite.rotation = (rotation * Math.PI) / 2;
      sprite.position.set((col + 0.5) * tileSize, (row + 0.5) * tileSize);
      parent.addChild(sprite);
    };

    for (let row = -MARGIN_TILES; row < map.rows + MARGIN_TILES; row++) {
      for (let col = -MARGIN_TILES; col < map.cols + MARGIN_TILES; col++) {
        const shallow = map.shallowAt(col, row);
        if (shallow) place(shallows, col, row, shallow);
        const ground = map.groundAt(col, row);
        if (ground) place(land, col, row, ground);
      }
    }
    for (const { col, row, tile } of map.overlays) {
      place(land, col, row, { tile, flipX: false, flipY: false, rotation: 0 });
    }

    if (options.debugIslands) {
      const overlay = new Graphics();
      for (const polygon of map.islands) {
        overlay
          .poly(polygon.flatMap(({ x, y }) => [x, y]))
          .stroke({ width: 2, color: 0xff00ff });
      }
      this.container.addChild(overlay);
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.water.tilePosition.set(
      this.time * WATER_DRIFT.x,
      this.time * WATER_DRIFT.y,
    );
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

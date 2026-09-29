import { Container, Graphics, Sprite } from "pixi.js";
import type { TileMap } from "../../arena";
import { getTileTexture } from "../../assets/loadGameAssets";

// Células desenhadas além de cada borda da arena, repetindo o litoral, para o
// cenário cobrir a tela inteira no letterbox (cobre de ~4:3 a ~21:9).
const MARGIN_TILES = 12;

export interface TileMapViewOptions {
  /** Desenha os polígonos de colisão das ilhas por cima (depuração). */
  readonly debugIslands?: boolean;
}

/**
 * Cena estática do mapa: água, terra (tiles espelhados/girados), fortes e
 * enfeites. Montada uma vez; nada aqui muda durante a partida.
 */
export class TileMapView {
  readonly container = new Container();

  constructor(map: TileMap, options: TileMapViewOptions = {}) {
    const { tileSize } = map;
    const place = (
      tile: number,
      col: number,
      row: number,
      flipX = false,
      flipY = false,
      rotation = 0,
    ) => {
      const sprite = new Sprite(getTileTexture(tile));
      // Âncora no centro para espelhar/girar sem deslocar o tile.
      sprite.anchor.set(0.5);
      sprite.scale.set(flipX ? -1 : 1, flipY ? -1 : 1);
      sprite.rotation = (rotation * Math.PI) / 2;
      sprite.position.set((col + 0.5) * tileSize, (row + 0.5) * tileSize);
      this.container.addChild(sprite);
    };

    for (let row = -MARGIN_TILES; row < map.rows + MARGIN_TILES; row++) {
      for (let col = -MARGIN_TILES; col < map.cols + MARGIN_TILES; col++) {
        // Água sob todas as células: os cantos transparentes da costa mostram o mar.
        place(map.waterTile, col, row);
        const ground = map.groundAt(col, row);
        if (ground) {
          const { tile, flipX, flipY, rotation } = ground;
          place(tile, col, row, flipX, flipY, rotation);
        }
      }
    }
    for (const { col, row, tile } of map.overlays) place(tile, col, row);

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

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

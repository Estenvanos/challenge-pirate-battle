import { Container, Sprite } from "pixi.js";
import { getCannonBallTexture } from "../../assets/loadGameAssets";
import type { Projectile } from "../../simulation/entities";

/**
 * Desenha os projéteis com um pool de sprites: nenhum Sprite é criado por
 * quadro, só quando há mais projéteis vivos do que sprites no pool.
 */
export class ProjectilesView {
  readonly container = new Container();

  private readonly sprites: Sprite[] = [];

  sync(projectiles: readonly Projectile[]): void {
    while (this.sprites.length < projectiles.length) {
      const sprite = new Sprite(getCannonBallTexture());
      sprite.anchor.set(0.5);
      this.sprites.push(sprite);
      this.container.addChild(sprite);
    }
    this.sprites.forEach((sprite, i) => {
      const projectile = projectiles[i];
      sprite.visible = projectile !== undefined;
      if (projectile) sprite.position.set(projectile.x, projectile.y);
    });
  }

  destroy(): void {
    this.sprites.length = 0;
    // A textura é compartilhada pelo cache do Assets; só a cena é destruída.
    this.container.destroy({ children: true });
  }
}

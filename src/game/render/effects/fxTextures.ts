import { Texture } from "pixi.js";

export interface FxTextures {
  /** Disco branco de borda suave: fumaça, espuma, gotas, sombra de projétil. */
  readonly circle: Texture;
  /** Anel fino: ondulações na água. */
  readonly ring: Texture;
  /** Cunha que some para trás: rastro do projétil. */
  readonly trail: Texture;
  /** Faixa que some para trás e nas bordas: esteira do navio. */
  readonly wake: Texture;
  destroy(): void;
}

function draw(
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  paint(ctx);
  return Texture.from(canvas);
}

/**
 * Texturas dos efeitos, desenhadas em canvas (o pacote de assets não as tem).
 * São brancas para receber `tint`. Quem cria chama `destroy()` ao final.
 */
export function createFxTextures(): FxTextures {
  const textures = {
    circle: draw(64, 64, (ctx) => {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.6, "rgba(255,255,255,0.7)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }),
    ring: draw(64, 64, (ctx) => {
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.stroke();
    }),
    trail: draw(64, 8, (ctx) => {
      const gradient = ctx.createLinearGradient(0, 0, 64, 0);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(1, "rgba(255,255,255,0.85)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(64, 0.5);
      ctx.lineTo(64, 7.5);
      ctx.closePath();
      ctx.fill();
    }),
    wake: draw(64, 10, (ctx) => {
      const across = ctx.createLinearGradient(0, 0, 0, 10);
      across.addColorStop(0, "rgba(255,255,255,0)");
      across.addColorStop(0.35, "rgba(255,255,255,0.9)");
      across.addColorStop(0.65, "rgba(255,255,255,0.9)");
      across.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = across;
      ctx.fillRect(0, 0, 64, 10);
      // Recorta o alfa ao longo do comprimento: some na ponta mais antiga.
      ctx.globalCompositeOperation = "destination-in";
      const along = ctx.createLinearGradient(0, 0, 64, 0);
      along.addColorStop(0, "rgba(255,255,255,0)");
      along.addColorStop(0.55, "rgba(255,255,255,0.45)");
      along.addColorStop(1, "rgba(255,255,255,0.85)");
      ctx.fillStyle = along;
      ctx.fillRect(0, 0, 64, 10);
    }),
  };
  return {
    ...textures,
    destroy() {
      for (const texture of Object.values(textures)) texture.destroy(true);
    },
  };
}

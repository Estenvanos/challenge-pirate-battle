import { useEffect, useRef, useState } from "react";
import { Game } from "../../game/core/Game";
import { MenuButton } from "../../shared/components/MenuButton";

// Em dev, `?debugIslands` desenha os polígonos de colisão das ilhas.
const DEBUG_ISLANDS =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has("debugIslands");

type LoadState =
  | { status: "loading"; progress: number }
  | { status: "ready" }
  | { status: "error" };

// Cada tentativa é uma montagem nova (key), então "Retry" não precisa de efeito.
export function GameCanvas() {
  const [attempt, setAttempt] = useState(0);
  return (
    <GameCanvasHost key={attempt} onRetry={() => setAttempt((n) => n + 1)} />
  );
}

function GameCanvasHost({ onRetry }: { onRetry: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState<LoadState>({
    status: "loading",
    progress: 0,
  });

  useEffect(() => {
    // Sincroniza a instância do Game (Pixi) com o ciclo de vida do componente.
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const game = new Game();
    game
      .init(host, {
        debugIslands: DEBUG_ISLANDS,
        onLoadProgress: (progress) => {
          if (!cancelled) setLoad({ status: "loading", progress });
        },
      })
      .then(
        () => {
          if (cancelled)
            game.destroy(); // desmontou durante o init
          else setLoad({ status: "ready" });
        },
        (error: unknown) => {
          game.destroy();
          if (cancelled) return;
          console.warn("Failed to load game assets", error);
          setLoad({ status: "error" });
        },
      );
    return () => {
      cancelled = true;
      game.destroy(); // seguro antes do fim do init e se chamado duas vezes
    };
  }, []);

  return (
    <div className="game-canvas">
      <div ref={hostRef} className="game-canvas__host" />
      {load.status === "loading" && (
        <p className="game-canvas__message" role="status">
          Loading arena… {Math.round(load.progress * 100)}%
        </p>
      )}
      {load.status === "error" && (
        <div className="game-canvas__message" role="alert">
          <p>The arena could not be loaded.</p>
          <MenuButton size="sm" onClick={onRetry}>
            Retry
          </MenuButton>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import type { GameOptions } from "../../config/options";
import { gameStore } from "../../game/bridge/gameStore";
import { Game } from "../../game/core/Game";
import { ArenaLoading } from "./ArenaLoading";
import { usePause } from "./PauseProvider";
import { TouchControls } from "./TouchControls";

// Em dev, `?debugIslands` desenha os polígonos de colisão das ilhas.
const DEBUG_ISLANDS =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has("debugIslands");

type LoadState =
  | { status: "loading"; progress: number }
  | { status: "ready" }
  | { status: "error" };

// Cada tentativa é uma montagem nova (key), então "Retry" não precisa de efeito.
interface GameCanvasProps {
  /** Snapshot congelado das opções; fixo durante a partida. */
  options: Readonly<GameOptions>;
}

export function GameCanvas({ options }: GameCanvasProps) {
  const [attempt, setAttempt] = useState(0);
  return (
    <GameCanvasHost
      key={attempt}
      options={options}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}

function GameCanvasHost({
  options,
  onRetry,
}: GameCanvasProps & { onRetry: () => void }) {
  const { paused } = usePause();
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
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
    gameRef.current = game;
    game
      .init(host, {
        options,
        debugIslands: DEBUG_ISLANDS,
        onPlayerHealth: gameStore.setPlayerHealth,
        onScore: gameStore.setScore,
        onTimeLeft: gameStore.setTimeLeft,
        // Direto no DOM (variáveis CSS lidas pelos botões de tiro): sem render por quadro.
        onCooldowns: (ratios) => {
          const root = rootRef.current;
          if (!root) return;
          for (const [slot, ratio] of Object.entries(ratios)) {
            root.style.setProperty(`--cooldown-${slot}`, ratio.toFixed(3));
          }
        },
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
      gameRef.current = null;
      game.destroy(); // seguro antes do fim do init e se chamado duas vezes
      gameStore.reset(); // a próxima partida começa com o HUD cheio
    };
  }, [options]);

  useEffect(() => {
    // Sincroniza a pausa da UI com o Game (roda depois do efeito que o cria).
    gameRef.current?.setPaused(paused);
  }, [paused, options]);

  return (
    <div ref={rootRef} className="game-canvas">
      <div ref={hostRef} className="game-canvas__host" />
      <TouchControls
        onAction={(action, pressed) =>
          gameRef.current?.setAction(action, pressed)
        }
      />
      {load.status !== "ready" && (
        <ArenaLoading
          progress={load.status === "loading" ? load.progress : null}
          onRetry={onRetry}
        />
      )}
    </div>
  );
}

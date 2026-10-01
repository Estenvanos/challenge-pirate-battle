import { useEffect, useRef, useState } from "react";
import type { GameOptions } from "../../config/options";
import { gameStore } from "../../game/bridge/gameStore";
import { Game, type MatchResult } from "../../game/core/Game";
import { isMuted } from "../../shared/audio/mute";
import {
  exposeGameForTests,
  testManualClock,
  testSeed,
} from "../../testing/testHooks";
import { ArenaLoading } from "./ArenaLoading";
import { usePause } from "./PauseProvider";
import { TouchControls } from "./TouchControls";

const DEBUG_ISLANDS =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has("debugIslands");

type LoadState =
  | { status: "loading"; progress: number }
  | { status: "ready" }
  | { status: "error" };

interface GameCanvasProps {
  options: Readonly<GameOptions>;
  onMatchEnd: (result: MatchResult) => void;
}

export function GameCanvas({ options, onMatchEnd }: GameCanvasProps) {
  // Retry remounts the host so every Pixi resource starts fresh.
  const [attempt, setAttempt] = useState(0);
  return (
    <GameCanvasHost
      key={attempt}
      options={options}
      onMatchEnd={onMatchEnd}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}

function GameCanvasHost({
  options,
  onMatchEnd,
  onRetry,
}: GameCanvasProps & { onRetry: () => void }) {
  const { paused } = usePause();
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  // Read the latest callback without rebuilding the Pixi instance.
  const onMatchEndRef = useRef(onMatchEnd);
  useEffect(() => {
    onMatchEndRef.current = onMatchEnd;
  });
  const [load, setLoad] = useState<LoadState>({
    status: "loading",
    progress: 0,
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const game = new Game();
    gameRef.current = game;
    game
      .init(host, {
        options,
        debugIslands: DEBUG_ISLANDS,
        seed: testSeed(),
        manualClock: testManualClock(),
        isMuted,
        onPlayerHealth: gameStore.setPlayerHealth,
        onScore: gameStore.setScore,
        onTimeLeft: gameStore.setTimeLeft,
        onMatchEnd: (result) => onMatchEndRef.current(result),
        // CSS variables update weapon veils without a React render per frame.
        onCooldowns: (ratios) => {
          const root = rootRef.current;
          if (!root) return;
          for (const [slot, ratio] of Object.entries(ratios)) {
            root.style.setProperty(`--cooldown-${slot}`, ratio.toFixed(3));
          }
        },
        onLoadProgress: (progress) => {
          // Other bundle progress callbacks may arrive after a failed load.
          if (!cancelled) {
            setLoad((current) =>
              current.status === "error"
                ? current
                : { status: "loading", progress },
            );
          }
        },
      })
      .then(
        () => {
          if (cancelled)
            game.destroy(); // Unmounted during initialization.
          else {
            exposeGameForTests(game);
            setLoad({ status: "ready" });
          }
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
      exposeGameForTests(null);
      game.destroy(); // Safe before initialization completes and if called twice.
      gameStore.reset(); // The next match starts with a full HUD.
    };
  }, [options]);

  useEffect(() => {
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

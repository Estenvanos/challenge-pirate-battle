import { useEffect } from "react";
import type { GameOptions } from "../../config/options";
import { ACTION_BY_CODE } from "../../game/input/bindings";
import { RoundButton } from "../../shared/components/RoundButton";
import { GameCanvas } from "./GameCanvas";
import { Hud } from "./Hud";
import { PauseMenu } from "./PauseMenu";
import { usePause } from "./PauseProvider";
import { TouchControls } from "./TouchControls";

interface MatchScreenProps {
  config: Readonly<GameOptions>;
  playerName: string;
  /** Opções salvas (valem para a próxima partida), editáveis no menu de pausa. */
  options: GameOptions;
  onOptionsChange: (options: GameOptions) => void;
  onExit: () => void;
}

const PAUSE_CODES = [...ACTION_BY_CODE]
  .filter(([, action]) => action === "pause")
  .map(([code]) => code);

// Tela da partida: arena, controles, pausa e HUD (ainda estático); combate virá depois.
export function MatchScreen({
  config,
  playerName,
  options,
  onOptionsChange,
  onExit,
}: MatchScreenProps) {
  const { paused, setPaused } = usePause();

  useEffect(() => {
    // Sincroniza com window/document: tecla de pausa e pausa automática ao perder o foco.
    const pause = () => setPaused(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!PAUSE_CODES.includes(event.code)) return;
      // A tecla alterna a pausa só aqui: sem o preventDefault, o <dialog> recém-aberto
      // trataria o mesmo Esc como "fechar" e a partida retomaria na hora.
      event.preventDefault();
      if (!event.repeat) setPaused((current) => !current);
    };
    const onVisibilityChange = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      setPaused(false); // sair da partida nunca deixa a pausa ligada
    };
  }, [setPaused]);

  return (
    <section className="match" aria-labelledby="match-title">
      <h1 id="match-title" className="visually-hidden">
        Battle — {playerName}, {config.sessionTimeSec} s session,{" "}
        {config.spawnIntervalSec} s enemy spawn
      </h1>
      <GameCanvas options={config} />
      <TouchControls />
      <div className="match__bar">
        <Hud sessionTimeSec={config.sessionTimeSec} />
        <RoundButton
          icon="pause"
          label="Pause"
          className="round-button--control"
          aria-keyshortcuts={PAUSE_CODES.join(" ")}
          onClick={() => setPaused(true)}
        />
      </div>
      {paused && (
        <PauseMenu
          options={options}
          onOptionsChange={onOptionsChange}
          onResume={() => setPaused(false)}
          onExit={onExit}
        />
      )}
    </section>
  );
}

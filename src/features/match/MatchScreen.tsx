import { useEffect, useRef, useState } from "react";
import type { MatchRecord } from "../../schemas/match";
import type { GameOptions } from "../../config/options";
import { LOCAL_PLAYER_ID } from "../../config/player";
import type { MatchResult } from "../../game/core/Game";
import { ACTION_BY_CODE } from "../../game/input/bindings";
import { useSubmitMatch } from "../../hooks/useSubmitMatch";
import { writeLastResult } from "../../storage/lastResultStorage";
import { playUiSound } from "../../shared/audio/uiSounds";
import { RoundButton } from "../../shared/components/RoundButton";
import { ResultDialog } from "../result/ResultDialog";
import { GameCanvas } from "./GameCanvas";
import { Hud } from "./Hud";
import { MatchAnnouncer } from "./MatchAnnouncer";
import { PauseMenu } from "./PauseMenu";
import { usePause } from "./PauseProvider";

interface MatchScreenProps {
  /** Id desta partida, gerado no cliente; reenviar o mesmo id não duplica o registro. */
  matchId: string;
  config: Readonly<GameOptions>;
  playerName: string;
  /** Opções salvas (valem para a próxima partida), editáveis no menu de pausa. */
  options: GameOptions;
  onOptionsChange: (options: GameOptions) => void;
  onPlayAgain: () => void;
  onExit: () => void;
}

const PAUSE_CODES = [...ACTION_BY_CODE]
  .filter(([, action]) => action === "pause")
  .map(([code]) => code);

// Tela da partida: arena, controles, HUD, pausa e, ao final, o resultado.
export function MatchScreen({
  matchId,
  config,
  playerName,
  options,
  onOptionsChange,
  onPlayAgain,
  onExit,
}: MatchScreenProps) {
  const { paused, setPaused } = usePause();
  const [result, setResult] = useState<MatchResult | null>(null);
  const submission = useSubmitMatch();
  const menuOpen = paused && !result;
  const wasMenuOpen = useRef(menuOpen);

  useEffect(() => {
    // Som ao abrir e fechar o menu de pausa; o ref ignora a montagem (e a dupla do Strict Mode).
    if (menuOpen === wasMenuOpen.current) return;
    wasMenuOpen.current = menuOpen;
    playUiSound(menuOpen ? "open" : "close");
  }, [menuOpen]);

  // Fim da partida: mostra o resultado e registra no ranking e no histórico.
  function handleMatchEnd(ended: MatchResult) {
    setResult(ended);
    const record: MatchRecord = {
      matchId,
      playerId: LOCAL_PLAYER_ID,
      playerName,
      date: new Date().toISOString(),
      score: ended.score,
      // Décimos de segundo bastam para o desempate do ranking.
      durationSec: Math.round(ended.durationSec * 10) / 10,
      endReason: ended.endReason,
      config: { ...config },
    };
    writeLastResult(record);
    submission.mutate(record);
  }

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
      <GameCanvas options={config} onMatchEnd={handleMatchEnd} />
      <MatchAnnouncer />
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
      {result && (
        <ResultDialog
          result={result}
          submission={
            submission.isSuccess
              ? "saved"
              : submission.isError
                ? "failed"
                : "pending"
          }
          onRetrySubmit={() =>
            submission.variables && submission.mutate(submission.variables)
          }
          onPlayAgain={onPlayAgain}
          onExit={onExit}
        />
      )}
      {menuOpen && (
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

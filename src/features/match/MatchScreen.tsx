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
  matchId: string;
  config: Readonly<GameOptions>;
  playerName: string;
  options: GameOptions;
  onOptionsChange: (options: GameOptions) => void;
  onPlayAgain: () => void;
  onExit: () => void;
}

const PAUSE_CODES = [...ACTION_BY_CODE]
  .filter(([, action]) => action === "pause")
  .map(([code]) => code);

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
    if (menuOpen === wasMenuOpen.current) return;
    wasMenuOpen.current = menuOpen;
    playUiSound(menuOpen ? "open" : "close");
  }, [menuOpen]);

  function handleMatchEnd(ended: MatchResult) {
    const record: MatchRecord = {
      matchId,
      playerId: LOCAL_PLAYER_ID,
      playerName,
      date: new Date().toISOString(),
      score: ended.score,
      // Tenths of a second provide a stable ranking tie-break.
      durationSec: Math.round(ended.durationSec * 10) / 10,
      endReason: ended.endReason,
      config: { ...config },
    };
    // Mesma duração arredondada do registro, para o diálogo e o histórico baterem.
    setResult({ ...ended, durationSec: record.durationSec });
    writeLastResult(record);
    submission.mutate(record);
  }

  useEffect(() => {
    const pause = () => setPaused(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!PAUSE_CODES.includes(event.code)) return;
      // Prevent the same Escape press from closing the newly opened dialog.
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
      setPaused(false); // Leaving a match always clears the pause state.
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

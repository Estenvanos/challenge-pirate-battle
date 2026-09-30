import type { ReactNode } from "react";
import type { MatchResult } from "../../game/core/Game";
import { MenuButton } from "../../shared/components/MenuButton";
import { Modal } from "../../shared/components/Modal";
import { formatDuration, formatEndReason } from "../../shared/utils/format";

const TITLES: Record<MatchResult["endReason"], string> = {
  timeUp: "Battle Complete",
  playerDestroyed: "Game Over",
};

interface ResultDialogProps {
  result: MatchResult;
  /** Situação do registro da partida no ranking/histórico. */
  submission: "pending" | "saved" | "failed";
  onRetrySubmit: () => void;
  onPlayAgain: () => void;
  onExit: () => void;
}

// Resultado da partida (sample_result.png): vitória por tempo ou derrota.
export function ResultDialog({
  result,
  submission,
  onRetrySubmit,
  onPlayAgain,
  onExit,
}: ResultDialogProps) {
  const status: Record<ResultDialogProps["submission"], ReactNode> = {
    pending: "Saving your result…",
    saved: "Result saved to the ranking.",
    failed: (
      <>
        Could not save your result.{" "}
        <button type="button" className="result__retry" onClick={onRetrySubmit}>
          Try again
        </button>
      </>
    ),
  };

  return (
    // Esc não fecha: o resultado só sai por uma das duas ações.
    <Modal labelledBy="result-title" describedBy="result-desc" onClose={noop}>
      <h2 id="result-title" className="panel__title result__title">
        {TITLES[result.endReason]}
      </h2>
      <div id="result-desc" className="result">
        <p className="result__score">
          <span className="visually-hidden">Score: </span>
          {result.score}
        </p>
        <p className="result__details">
          Points · <span className="visually-hidden">time played </span>
          {formatDuration(result.durationSec)} ·{" "}
          {formatEndReason(result.endReason)}
        </p>
      </div>
      <p
        className="modal__text"
        role={submission === "failed" ? "alert" : "status"}
      >
        {status[submission]}
      </p>
      <MenuButton autoFocus onClick={onPlayAgain}>
        Play Again
      </MenuButton>
      <MenuButton onClick={onExit}>Main Menu</MenuButton>
    </Modal>
  );
}

function noop() {}

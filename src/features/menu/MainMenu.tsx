import { useState } from "react";
import type { Action } from "../../game/input/actions";
import { KEY_BINDINGS } from "../../game/input/bindings";
import { usePendingSubmissions } from "../../hooks/usePendingSubmissions";
import { MenuButton } from "../../shared/components/MenuButton";
import { Panel } from "../../shared/components/Panel";
import { pngAsset } from "../../shared/utils/assets";
import { formatDuration, formatEndReason } from "../../shared/utils/format";
import { readLastResult } from "../../storage/lastResultStorage";
import type { LogTab } from "../../constants/ui";

interface MainMenuProps {
  onPlay: () => void;
  onOptions: () => void;
  onOpenLog: (tab: LogTab) => void;
}

const title = pngAsset("ui/menu/title_pirate_battle.png");
const ship = pngAsset("ships/ship_2.png");

// One-line summary with each action's first key; the full list is in Options.
const CONTROL_SUMMARY: readonly { label: string; actions: Action[] }[] = [
  { label: "sail", actions: ["forward"] },
  { label: "turn", actions: ["rotateLeft", "rotateRight"] },
  { label: "fire", actions: ["fireFront"] },
  { label: "broadsides", actions: ["fireLeft", "fireRight"] },
  { label: "pause", actions: ["pause"] },
];

const firstKey = (action: Action) =>
  KEY_BINDINGS.find((binding) => binding.action === action)?.keys[0]?.display;

export function MainMenu({ onPlay, onOptions, onOpenLog }: MainMenuProps) {
  const [lastResult] = useState(readLastResult);
  const { pending, saving, resend } = usePendingSubmissions();

  return (
    <Panel labelledBy="menu-title">
      <h1 id="menu-title" className="menu__title">
        <img
          src={title.src}
          srcSet={title.srcSet}
          alt="Pirate Battle"
          width={384}
          height={128}
        />
      </h1>
      <p className="menu__tagline">Set sail. Take command.</p>
      <div className="menu__actions">
        <MenuButton onClick={onPlay}>Play</MenuButton>
        <MenuButton onClick={onOptions}>Options</MenuButton>
      </div>
      <p className="menu__hint menu__controls">
        <span className="menu__controls-keys">
          {CONTROL_SUMMARY.map(({ label, actions }, index) => (
            <span key={label}>
              {index > 0 && " · "}
              {actions.map((action) => (
                <kbd key={action}>{firstKey(action)}</kbd>
              ))}{" "}
              {label}
            </span>
          ))}
        </span>
        <span className="menu__controls-touch">
          Hold the on-screen buttons to sail, turn and fire.
        </span>
      </p>
      <img
        className="menu__ship"
        src={ship.src}
        srcSet={ship.srcSet}
        alt=""
        width={66}
        height={113}
      />
      <p className="menu__hint">Navigate the islands. Survive the battle.</p>
      {lastResult && (
        <p className="menu__last">
          Last battle: <strong>{lastResult.score}</strong> points ·{" "}
          <span className="visually-hidden">time played </span>
          {formatDuration(lastResult.durationSec)} ·{" "}
          {formatEndReason(lastResult.endReason)}
        </p>
      )}
      <p className="menu__pending" role="status">
        {pending.length > 0 &&
          (saving ? (
            "Saving match results…"
          ) : (
            <>
              {pending.length === 1
                ? "1 match result is not saved yet."
                : `${pending.length} match results are not saved yet.`}{" "}
              <button type="button" className="result__retry" onClick={resend}>
                Try again
              </button>
            </>
          ))}
      </p>
      <div className="menu__log-actions">
        <MenuButton
          variant="secondary"
          size="sm"
          onClick={() => onOpenLog("ranking")}
        >
          Ranking
        </MenuButton>
        <MenuButton
          variant="secondary"
          size="sm"
          onClick={() => onOpenLog("history")}
        >
          Match History
        </MenuButton>
      </div>
    </Panel>
  );
}

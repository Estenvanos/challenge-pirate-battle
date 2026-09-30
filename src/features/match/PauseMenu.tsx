import { useState } from "react";
import type { GameOptions } from "../../config/options";
import { MenuButton } from "../../shared/components/MenuButton";
import { Modal } from "../../shared/components/Modal";
import { OptionsFields } from "../options/OptionsScreen";

interface PauseMenuProps {
  options: GameOptions;
  onOptionsChange: (options: GameOptions) => void;
  onResume: () => void;
  onExit: () => void;
}

// Menu de pausa (sample_pause.png). Esc fecha o diálogo, o que retoma a partida.
export function PauseMenu({
  options,
  onOptionsChange,
  onResume,
  onExit,
}: PauseMenuProps) {
  const [view, setView] = useState<"menu" | "options">("menu");

  return (
    <Modal labelledBy="pause-title" describedBy="pause-desc" onClose={onResume}>
      {view === "menu" ? (
        <>
          <h2 id="pause-title" className="panel__title">
            Paused
          </h2>
          <p id="pause-desc" className="modal__text">
            Ready when you are.
          </p>
          <MenuButton autoFocus onClick={onResume}>
            Resume
          </MenuButton>
          <MenuButton onClick={() => setView("options")}>Options</MenuButton>
          <MenuButton onClick={onExit}>Main Menu</MenuButton>
        </>
      ) : (
        <>
          <h2 id="pause-title" className="panel__title">
            Options
          </h2>
          <p id="pause-desc" className="modal__text">
            Changes apply to the next match.
          </p>
          <OptionsFields options={options} onChange={onOptionsChange} />
          <MenuButton autoFocus onClick={() => setView("menu")}>
            Back
          </MenuButton>
        </>
      )}
    </Modal>
  );
}

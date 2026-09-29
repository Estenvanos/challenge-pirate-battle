import { useState, type FormEvent } from "react";
import {
  PLAYER_NAME_LIMITS,
  normalizePlayerName,
  validatePlayerName,
} from "../../config/player";
import { MenuButton } from "../../shared/components/MenuButton";
import { Modal } from "../../shared/components/Modal";

interface PlayerNameDialogProps {
  initialName?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function PlayerNameDialog({
  initialName = "",
  onSubmit,
  onCancel,
}: PlayerNameDialogProps) {
  const [value, setValue] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = normalizePlayerName(value);
    const message = validatePlayerName(name);
    if (message) {
      setError(message);
      return;
    }
    onSubmit(name);
  }

  return (
    <Modal
      labelledBy="player-name-title"
      describedBy="player-name-desc"
      onClose={onCancel}
    >
      <h2 id="player-name-title" className="panel__title">
        Name your captain
      </h2>
      <p id="player-name-desc" className="modal__text">
        Your name appears in the ranking and match history.
      </p>
      <form className="player-form" noValidate onSubmit={handleSubmit}>
        <label htmlFor="player-name-input" className="option__label">
          Captain name
        </label>
        <input
          id="player-name-input"
          className="text-field"
          type="text"
          value={value}
          autoFocus
          autoComplete="nickname"
          spellCheck={false}
          maxLength={PLAYER_NAME_LIMITS.max + 8}
          placeholder="Captain Jack"
          aria-invalid={error !== null}
          aria-describedby={error ? "player-name-error" : "player-name-hint"}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
        />
        {error ? (
          <p id="player-name-error" className="player-form__error" role="alert">
            {error}
          </p>
        ) : (
          <p id="player-name-hint" className="option__hint">
            {PLAYER_NAME_LIMITS.min}–{PLAYER_NAME_LIMITS.max} characters
          </p>
        )}
        <div className="player-form__actions">
          <MenuButton type="submit">Set sail</MenuButton>
          <MenuButton variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </MenuButton>
        </div>
      </form>
    </Modal>
  );
}

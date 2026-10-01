import {
  OPTIONS_LIMITS,
  clampOption,
  type GameOptions,
} from "../../config/options";
import { useState, useSyncExternalStore } from "react";
import { isMuted, setMuted, subscribeMuted } from "../../shared/audio/mute";
import { MenuButton } from "../../shared/components/MenuButton";
import { Panel } from "../../shared/components/Panel";
import { RoundButton } from "../../shared/components/RoundButton";
import { ControlsList } from "./ControlsList";

interface OptionsFieldsProps {
  options: GameOptions;
  onChange: (options: GameOptions) => void;
}

interface OptionsScreenProps extends OptionsFieldsProps {
  onBack: () => void;
}

const FIELDS: readonly { key: keyof GameOptions; label: string }[] = [
  { key: "sessionTimeSec", label: "Game session time" },
  { key: "spawnIntervalSec", label: "Enemy spawn time" },
];

function SoundToggle() {
  const muted = useSyncExternalStore(subscribeMuted, isMuted);
  return (
    <div className="option">
      <span id="option-sound-label" className="option__label">
        Sound
      </span>
      <MenuButton
        variant="secondary"
        size="sm"
        aria-labelledby="option-sound-label"
        aria-pressed={muted}
        onClick={() => setMuted(!muted)}
      >
        {muted ? "Muted" : "On"}
      </MenuButton>
    </div>
  );
}

export function OptionsFields({ options, onChange }: OptionsFieldsProps) {
  function step(key: keyof GameOptions, direction: 1 | -1) {
    const next = clampOption(
      key,
      options[key] + direction * OPTIONS_LIMITS[key].step,
    );
    onChange({ ...options, [key]: next });
  }

  return (
    <>
      {FIELDS.map(({ key, label }) => {
        const { min, max } = OPTIONS_LIMITS[key];
        const value = options[key];
        const labelId = `option-${key}-label`;
        const hintId = `option-${key}-hint`;
        return (
          <div
            key={key}
            className="option"
            role="group"
            aria-labelledby={labelId}
          >
            <span id={labelId} className="option__label">
              {label}
            </span>
            <div className="option__stepper">
              <RoundButton
                icon="minus"
                label={`Decrease ${label.toLowerCase()}`}
                disabled={value <= min}
                onClick={() => step(key, -1)}
              />
              <output
                className="option__value"
                aria-labelledby={labelId}
                aria-describedby={hintId}
                aria-live="polite"
              >
                {value} s
              </output>
              <RoundButton
                icon="plus"
                label={`Increase ${label.toLowerCase()}`}
                disabled={value >= max}
                onClick={() => step(key, 1)}
              />
            </div>
            <span id={hintId} className="option__hint">
              {min}–{max} seconds
            </span>
          </div>
        );
      })}
      <SoundToggle />
    </>
  );
}

export function OptionsScreen({
  options,
  onChange,
  onBack,
}: OptionsScreenProps) {
  const [view, setView] = useState<"options" | "controls">("options");

  if (view === "controls") {
    return (
      <Panel labelledBy="controls-title">
        <h1 id="controls-title" className="panel__title">
          Controls
        </h1>
        <ControlsList />
        <MenuButton autoFocus onClick={() => setView("options")}>
          Back
        </MenuButton>
      </Panel>
    );
  }

  return (
    <Panel labelledBy="options-title">
      <h1 id="options-title" className="panel__title">
        Options
      </h1>
      <OptionsFields options={options} onChange={onChange} />
      <MenuButton
        variant="secondary"
        size="sm"
        onClick={() => setView("controls")}
      >
        Controls
      </MenuButton>
      <MenuButton onClick={onBack}>Main Menu</MenuButton>
    </Panel>
  );
}

import {
  OPTIONS_LIMITS,
  clampOption,
  type GameOptions,
} from "../../config/options";
import { MenuButton } from "../../shared/components/MenuButton";
import { Panel } from "../../shared/components/Panel";
import { RoundButton } from "../../shared/components/RoundButton";

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

// Steppers das opções, usados na tela de opções e no menu de pausa.
export function OptionsFields({ options, onChange }: OptionsFieldsProps) {
  function step(key: keyof GameOptions, direction: 1 | -1) {
    const next = clampOption(
      key,
      options[key] + direction * OPTIONS_LIMITS[key].step,
    );
    onChange({ ...options, [key]: next });
  }

  return FIELDS.map(({ key, label }) => {
    const { min, max } = OPTIONS_LIMITS[key];
    const value = options[key];
    const labelId = `option-${key}-label`;
    const hintId = `option-${key}-hint`;
    return (
      <div key={key} className="option" role="group" aria-labelledby={labelId}>
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
  });
}

export function OptionsScreen({
  options,
  onChange,
  onBack,
}: OptionsScreenProps) {
  return (
    <Panel labelledBy="options-title">
      <h1 id="options-title" className="panel__title">
        Options
      </h1>
      <OptionsFields options={options} onChange={onChange} />
      <MenuButton onClick={onBack}>Main Menu</MenuButton>
    </Panel>
  );
}

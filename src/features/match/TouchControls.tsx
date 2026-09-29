import type { Action } from "../../game/input/actions";
import { KEY_BINDINGS } from "../../game/input/bindings";
import {
  RoundButton,
  type RoundIcon,
} from "../../shared/components/RoundButton";

interface ControlDefinition {
  action: Action;
  icon: RoundIcon;
  label: string;
}

// Mesma disposição do sample: ação principal em cima, laterais embaixo.
const MOVEMENT: readonly ControlDefinition[] = [
  { action: "forward", icon: "forward", label: "Move forward" },
  { action: "rotateLeft", icon: "turn_left", label: "Turn left" },
  { action: "rotateRight", icon: "turn_right", label: "Turn right" },
];

const WEAPONS: readonly ControlDefinition[] = [
  { action: "fireFront", icon: "fire_front", label: "Fire front cannon" },
  { action: "fireLeft", icon: "fire_left", label: "Fire left cannons" },
  { action: "fireRight", icon: "fire_right", label: "Fire right cannons" },
];

// Teclas de cada ação, da mesma fonte que o InputManager usa.
function keysFor(action: Action) {
  return KEY_BINDINGS.find((binding) => binding.action === action)?.keys ?? [];
}

// Controles na tela: por enquanto só visuais, sem ação ligada ao jogo.
export function TouchControls() {
  return (
    <>
      <ControlGroup label="Movement" side="left" controls={MOVEMENT} />
      <ControlGroup label="Weapons" side="right" controls={WEAPONS} />
    </>
  );
}

function ControlGroup({
  label,
  side,
  controls,
}: {
  label: string;
  side: "left" | "right";
  controls: readonly ControlDefinition[];
}) {
  return (
    <div
      className={`touch-controls touch-controls--${side}`}
      role="group"
      aria-label={label}
    >
      {controls.map(({ action, icon, label: controlLabel }) => {
        const keys = keysFor(action);
        return (
          <div key={icon} className={`touch-control touch-controls__${icon}`}>
            <RoundButton
              icon={icon}
              label={controlLabel}
              className="round-button--control"
              aria-keyshortcuts={
                keys.map(({ code }) => code).join(" ") || undefined
              }
            />
            {keys.length > 0 && (
              // Legenda visual; leitores de tela recebem aria-keyshortcuts.
              <span className="touch-control__keys" aria-hidden="true">
                {keys.map(({ display }) => display).join(" / ")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

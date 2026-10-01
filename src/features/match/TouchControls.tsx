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

function keysFor(action: Action) {
  return KEY_BINDINGS.find((binding) => binding.action === action)?.keys ?? [];
}

type OnAction = (action: Action, pressed: boolean) => void;

export function TouchControls({ onAction }: { onAction: OnAction }) {
  return (
    <>
      <ControlGroup
        label="Movement"
        side="left"
        controls={MOVEMENT}
        onAction={onAction}
      />
      <ControlGroup
        label="Weapons"
        side="right"
        controls={WEAPONS}
        onAction={onAction}
      />
    </>
  );
}

function ControlGroup({
  label,
  side,
  controls,
  onAction,
}: {
  label: string;
  side: "left" | "right";
  controls: readonly ControlDefinition[];
  onAction: OnAction;
}) {
  return (
    <div
      className={`touch-controls touch-controls--${side}`}
      role="group"
      aria-label={label}
    >
      {controls.map(({ action, icon, label: controlLabel }) => {
        const keys = keysFor(action);
        const release = () => onAction(action, false);
        return (
          <div key={icon} className={`touch-control touch-controls__${icon}`}>
            <RoundButton
              icon={icon}
              label={controlLabel}
              className="round-button--control"
              silent
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                onAction(action, true);
              }}
              onPointerUp={release}
              onPointerCancel={release}
              onLostPointerCapture={release}
              onContextMenu={(event) => event.preventDefault()}
              aria-keyshortcuts={
                keys.map(({ code }) => code).join(" ") || undefined
              }
            />
            {keys.length > 0 && (
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

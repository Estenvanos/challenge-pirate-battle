import type { Action } from "./actions";

export interface KeyBinding {
  readonly action: Action;
  readonly label: string;
  readonly keys: readonly { readonly code: string; readonly display: string }[];
}

export const KEY_BINDINGS: readonly KeyBinding[] = [
  {
    action: "forward",
    label: "Sail",
    keys: [
      { code: "KeyW", display: "W" },
      { code: "ArrowUp", display: "↑" },
    ],
  },
  {
    action: "rotateLeft",
    label: "Turn left",
    keys: [
      { code: "KeyA", display: "A" },
      { code: "ArrowLeft", display: "←" },
    ],
  },
  {
    action: "rotateRight",
    label: "Turn right",
    keys: [
      { code: "KeyD", display: "D" },
      { code: "ArrowRight", display: "→" },
    ],
  },
  {
    action: "fireFront",
    label: "Fire front cannon",
    keys: [{ code: "Space", display: "Space" }],
  },
  {
    action: "fireLeft",
    label: "Fire left cannons",
    keys: [{ code: "KeyQ", display: "Q" }],
  },
  {
    action: "fireRight",
    label: "Fire right cannons",
    keys: [{ code: "KeyE", display: "E" }],
  },
  {
    action: "pause",
    label: "Pause",
    keys: [{ code: "Escape", display: "Esc" }],
  },
];

export const ACTION_BY_CODE: ReadonlyMap<string, Action> = new Map(
  KEY_BINDINGS.flatMap(({ action, keys }) =>
    keys.map(({ code }) => [code, action] as const),
  ),
);

import type { Action } from "./actions";

export interface KeyBinding {
  readonly action: Action;
  /** Texto do controle na UI. */
  readonly label: string;
  /** KeyboardEvent.code (independente do layout) e o nome exibido. */
  readonly keys: readonly { readonly code: string; readonly display: string }[];
}

// Fonte única dos controles de teclado: o InputManager e a UI leem daqui.
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
];

export const ACTION_BY_CODE: ReadonlyMap<string, Action> = new Map(
  KEY_BINDINGS.flatMap(({ action, keys }) =>
    keys.map(({ code }) => [code, action] as const),
  ),
);

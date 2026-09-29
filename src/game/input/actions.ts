// Ações abstratas: teclado e toque viram estas ações; a simulação só lê elas.

export const ACTIONS = [
  "forward",
  "rotateLeft",
  "rotateRight",
  "fireFront",
  "fireLeft",
  "fireRight",
  "pause",
] as const;

export type Action = (typeof ACTIONS)[number];

export type ActionState = Readonly<Record<Action, boolean>>;

export function emptyActionState(): Record<Action, boolean> {
  return Object.fromEntries(ACTIONS.map((action) => [action, false])) as Record<
    Action,
    boolean
  >;
}

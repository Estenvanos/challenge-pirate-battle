import { emptyActionState, type Action, type ActionState } from "./actions";
import { ACTION_BY_CODE } from "./bindings";

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement)
  );
}

/** Maps keyboard events to actions and clears held keys on lost focus. */
export class InputManager {
  private readonly state = emptyActionState();

  enabled = true;

  get actions(): ActionState {
    return this.state;
  }

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  clear = (): void => {
    for (const action of Object.keys(this.state) as (keyof ActionState)[]) {
      this.state[action] = false;
    }
  };

  setAction(action: Action, pressed: boolean): void {
    if (pressed && !this.enabled) return;
    this.state[action] = pressed;
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.clear();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = ACTION_BY_CODE.get(event.code);
    if (!this.enabled || !action || isEditable(event.target)) return;
    event.preventDefault();
    this.state[action] = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const action = ACTION_BY_CODE.get(event.code);
    if (!action) return;
    this.state[action] = false;
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.clear();
  };
}

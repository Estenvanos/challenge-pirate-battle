---
paths:
  - "src/game/input/**"
  - "src/features/match/TouchControls.tsx"
---

# Input rules

- Keyboard and touch are translated into abstract **actions** (`actions.ts`: forward, rotateLeft, rotateRight, fireFront, fireLeft, fireRight, pause). The simulation reads the action state once per tick; it never reads raw events.
- Movement and firing must work simultaneously (hold forward + rotate + fire).
- Game keys are captured (and `preventDefault`) **only** while gameplay is active — never in menus, dialogs or form fields.
- Clear all pressed state on `blur`, `visibilitychange` (hidden) and pause, so nothing is "stuck" or accumulated on resume.
- Touch controls: pointer events with multi-touch support, large enough hit areas, visible labels; they dispatch the same actions as the keyboard.
- Listeners are attached in `init` and removed in `destroy`.
- Controls shown in the UI must come from the same binding definitions (single source).

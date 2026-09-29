---
paths:
  - "src/**/*.tsx"
  - "src/**/use*.ts"
---

# useEffect rules

`useEffect` is an escape hatch to **synchronize with an external system**. Before writing one, ask: "what external system is this syncing with?" If there is no answer, don't use an effect.

## Allowed
- Creating/destroying the Pixi `Game` in `GameCanvas`.
- DOM/window listeners not expressible in JSX (`visibilitychange`, `blur`, `resize`, `keydown` for global shortcuts).
- Focus management side effects (focus trap, restoring focus) when a ref-based handler is not enough.
- Imperative third-party APIs.

## Not allowed — use the alternative
| Instead of an effect for… | Do this |
| --- | --- |
| Derived state (filter, format, compute from props/state) | Compute during render; `useMemo` only if expensive |
| Fetching ranking/history, submitting matches | TanStack Query (`useQuery`/`useMutation` in `src/api/hooks`) |
| Reacting to a user event (click, submit) | Do it in the event handler |
| Resetting state when a prop changes | Pass a `key` to the component |
| Syncing two pieces of state | Keep one source of truth, derive the other |
| Subscribing to `gameStore` / external stores | `useSyncExternalStore` (see `useGameSnapshot`) |
| Chains of effects setting state for each other | One handler or one reducer |
| Reading `localStorage` on mount | Lazy `useState(() => readOptions())` or read in the store module |

## Requirements for every effect
- Add a one-line comment naming the external system it syncs.
- Always return a cleanup that fully undoes the setup (remove listener, destroy instance, cancel request/timer).
- Idempotent under Strict Mode (mount → unmount → mount): no duplicated listeners, canvases or loops.
- Async setup guarded against finishing after cleanup (`cancelled` flag or `AbortController`).
- Complete, honest dependency arrays — never silence `react-hooks/exhaustive-deps`. Stabilize callbacks with refs if needed.

## Reference pattern: GameCanvas

```tsx
useEffect(() => {
  // Syncs the Pixi Game instance with this component's lifetime.
  const host = hostRef.current;
  if (!host) return;
  let cancelled = false;
  const game = new Game(configSnapshot, callbacks);
  void game.init(host).then(() => {
    if (cancelled) game.destroy(); // unmounted while initializing
  });
  return () => {
    cancelled = true;
    game.destroy(); // must be safe before init finishes and when called twice
  };
}, [configSnapshot, callbacks]);
```

---
paths:
  - "src/app/**"
  - "src/features/**"
  - "src/shared/**"
---

# React UI rules

## Game integration
- `GameCanvas.tsx` owns one `Game` instance: creates it on mount, destroys it on unmount. Safe under Strict Mode (see `use-effect.md`).
- The game loop never calls `setState`. HUD values come from `useGameSnapshot` (throttled `gameStore`) and discrete `EventBus` events.
- Leaving the match screen or refreshing ends the running match; an abandoned match is never submitted.

## Screens
- Menu (Play, Options, controls help, Ranking and Match History tabs), Options, Match (canvas, HUD, touch controls, pause), Result (score, time played, end reason, submission status, Play Again, Main Menu).
- API failures never block playing, options, or an ongoing match.

## Accessibility
- Full keyboard navigation in menus, visible focus styles, focus trap and focus return in dialogs (`useFocusTrap`).
- Every input has a `<label>`; validation errors are linked with `aria-describedby` and announced.
- `LiveRegion` announces discrete events only (score change, low HP, pause, match end) — never per frame.
- Score, time and match state also available in semantic HTML.
- Adequate contrast; visual identity consistent with the provided assets.

## Style
- UI text in English. Components small and typed; shared primitives in `src/shared/components`.
- Responsive for desktop and mobile; document the supported mobile orientation. No clipping of arena or HUD.

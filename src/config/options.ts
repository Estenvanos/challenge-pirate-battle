export interface GameOptions {
  sessionTimeSec: number;
  spawnIntervalSec: number;
}

export interface OptionLimits {
  min: number;
  max: number;
  step: number;
  default: number;
}

/** Session time is 60–180 active seconds; spawn interval is 1–10 seconds. */
export const OPTIONS_LIMITS: Readonly<Record<keyof GameOptions, OptionLimits>> =
  {
    sessionTimeSec: { min: 60, max: 180, step: 10, default: 120 },
    spawnIntervalSec: { min: 1, max: 10, step: 1, default: 3 },
  };

export const DEFAULT_OPTIONS: Readonly<GameOptions> = Object.freeze({
  sessionTimeSec: OPTIONS_LIMITS.sessionTimeSec.default,
  spawnIntervalSec: OPTIONS_LIMITS.spawnIntervalSec.default,
});

export function clampOption(key: keyof GameOptions, value: number): number {
  const { min, max } = OPTIONS_LIMITS[key];
  return Math.min(max, Math.max(min, value));
}

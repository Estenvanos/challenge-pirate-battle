// Opções que o jogador pode ajustar na tela Options. Cada partida congela um snapshot delas ao iniciar.

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

export const OPTIONS_LIMITS: Readonly<Record<keyof GameOptions, OptionLimits>> =
  {
    // Duração exigida pela proposta: 60 a 180 s de jogo ativo.
    sessionTimeSec: { min: 60, max: 180, step: 10, default: 120 },
    // Intervalo positivo, em segundos inteiros, para agrupar bem o ranking.
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

function isValidOption(key: keyof GameOptions, value: unknown): boolean {
  const { min, max } = OPTIONS_LIMITS[key];
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

export function isGameOptions(value: unknown): value is GameOptions {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isValidOption("sessionTimeSec", record.sessionTimeSec) &&
    isValidOption("spawnIntervalSec", record.spawnIntervalSec)
  );
}

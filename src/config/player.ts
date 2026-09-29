// Jogador local (sem autenticação): o id é fixo; o nome é escolhido pelo jogador e salvo localmente.
export const LOCAL_PLAYER_ID = "local-player";

export const PLAYER_NAME_LIMITS = Object.freeze({ min: 2, max: 16 });

// Letras (com acento), números, espaço, apóstrofo, hífen e sublinhado.
const PLAYER_NAME_PATTERN = /^[\p{L}\p{N}' _-]+$/u;

/** Remove espaços extras nas pontas e colapsa os internos. */
export function normalizePlayerName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Mensagem de erro para exibir, ou null quando o nome é válido. */
export function validatePlayerName(name: string): string | null {
  const { min, max } = PLAYER_NAME_LIMITS;
  if (name.length < min) return `Use at least ${min} characters.`;
  if (name.length > max) return `Use at most ${max} characters.`;
  if (!PLAYER_NAME_PATTERN.test(name)) {
    return "Use only letters, numbers, spaces, ' - and _.";
  }
  return null;
}

export function isPlayerName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value === normalizePlayerName(value) &&
    validatePlayerName(value) === null
  );
}

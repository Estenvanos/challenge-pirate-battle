import { z } from "zod";
import { normalizePlayerName, PLAYER_NAME_LIMITS } from "../config/player";

const { min, max } = PLAYER_NAME_LIMITS;

/** Nome já normalizado; as mensagens aparecem no diálogo, na ordem das regras. */
export const playerNameSchema = z
  .string()
  .min(min, `Use at least ${min} characters.`)
  .max(max, `Use at most ${max} characters.`)
  // Letras (com acento), números, espaço, apóstrofo, hífen e sublinhado.
  .regex(
    /^[\p{L}\p{N}' _-]+$/u,
    "Use only letters, numbers, spaces, ' - and _.",
  )
  .refine((name) => name === normalizePlayerName(name), "Remove extra spaces.");

/** Mensagem de erro para exibir, ou null quando o nome é válido. */
export function validatePlayerName(name: string): string | null {
  return playerNameSchema.safeParse(name).error?.issues[0]?.message ?? null;
}

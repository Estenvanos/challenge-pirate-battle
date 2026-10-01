import { z } from "zod";
import { normalizePlayerName, PLAYER_NAME_LIMITS } from "../config/player";

const { min, max } = PLAYER_NAME_LIMITS;

export const playerNameSchema = z
  .string()
  .min(min, `Use at least ${min} characters.`)
  .max(max, `Use at most ${max} characters.`)
  .regex(
    /^[\p{L}\p{N}' _-]+$/u,
    "Use only letters, numbers, spaces, ' - and _.",
  )
  .refine((name) => name === normalizePlayerName(name), "Remove extra spaces.");

export function validatePlayerName(name: string): string | null {
  return playerNameSchema.safeParse(name).error?.issues[0]?.message ?? null;
}

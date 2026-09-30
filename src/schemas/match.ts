// Contratos da API, compartilhados pelo cliente HTTP e pelos handlers do MSW.
// Cada schema é a fonte do tipo (z.infer) e da validação em tempo de execução.
import { z } from "zod";

export const endReasonSchema = z.enum(["timeUp", "playerDestroyed"]);
export type EndReason = z.infer<typeof endReasonSchema>;

export const matchConfigSchema = z.object({
  sessionTimeSec: z.number().nonnegative(),
  spawnIntervalSec: z.number().nonnegative(),
});
export type MatchConfig = z.infer<typeof matchConfigSchema>;

export const matchRecordSchema = z.object({
  matchId: z.string().min(1),
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  /** Data ISO 8601 do fim da partida. */
  date: z.iso.datetime(),
  score: z.number().int().nonnegative(),
  /** Duração efetiva (ativa, sem pausas) em segundos. */
  durationSec: z.number().nonnegative(),
  endReason: endReasonSchema,
  config: matchConfigSchema,
});
export type MatchRecord = z.infer<typeof matchRecordSchema>;

export const rankingEntrySchema = matchRecordSchema
  .pick({
    matchId: true,
    playerId: true,
    playerName: true,
    score: true,
    durationSec: true,
    date: true,
  })
  .extend({
    /** Posição a partir de 1, contando todas as páginas. */
    position: z.number().int().positive(),
  });
export type RankingEntry = z.infer<typeof rankingEntrySchema>;

const pageMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export function pageSchema<T extends z.ZodType>(item: T) {
  return pageMetaSchema.extend({ items: z.array(item) });
}
export type Page<T> = z.infer<typeof pageMetaSchema> & { items: T[] };

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const submitMatchResponseSchema = z.object({
  record: matchRecordSchema,
  /** false quando a partida já estava registrada (reenvio idempotente). */
  created: z.boolean(),
});
export type SubmitMatchResponse = z.infer<typeof submitMatchResponseSchema>;

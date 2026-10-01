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
  date: z.iso.datetime(),
  score: z.number().int().nonnegative(),
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
  created: z.boolean(),
});
export type SubmitMatchResponse = z.infer<typeof submitMatchResponseSchema>;

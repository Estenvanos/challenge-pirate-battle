// Query strings da API mock. Parâmetro ausente ou vazio usa o padrão; inválido vira 400.
import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants/api";

function optionalParam<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema);
}

const positiveInt = z.coerce.number().int().positive();

export const pageParamsSchema = z.object({
  page: optionalParam(positiveInt.default(1)),
  pageSize: optionalParam(
    positiveInt.max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  ),
});
export type PageParams = z.infer<typeof pageParamsSchema>;

export const rankingQuerySchema = z.object({
  sessionTime: z.coerce.number().positive(),
  spawnInterval: z.coerce.number().positive(),
});

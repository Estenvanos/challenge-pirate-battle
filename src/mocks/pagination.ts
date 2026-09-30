import type { Page } from "../schemas/match";
import type { PageParams } from "../schemas/query";

export function paginate<T>(
  items: readonly T[],
  { page, pageSize }: PageParams,
): Page<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / pageSize),
  };
}

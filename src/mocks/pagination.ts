import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type Page } from "../api/contracts";

export interface PageParams {
  page: number;
  pageSize: number;
}

function parsePositiveInt(raw: string | null, fallback: number): number | null {
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function parsePageParams(params: URLSearchParams): PageParams | null {
  const page = parsePositiveInt(params.get("page"), 1);
  const pageSize = parsePositiveInt(params.get("pageSize"), DEFAULT_PAGE_SIZE);
  if (page === null || pageSize === null || pageSize > MAX_PAGE_SIZE) {
    return null;
  }
  return { page, pageSize };
}

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

/**
 * Builds pagination meta object from API response.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
}

const DEFAULT_LIMIT = 50;

export function buildPaginationMeta(meta: ApiMeta | undefined, defaultLimit = DEFAULT_LIMIT): PaginationMeta {
  const page = meta?.page ?? 1;
  const limit = meta?.limit ?? defaultLimit;
  const total = meta?.total ?? 0;
  const pages =
    (meta as ApiMeta & { pages?: number })?.pages ??
    Math.ceil(total / limit);

  return { page, limit, total, pages };
}

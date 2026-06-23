import type { PaginationMeta } from './zod/pagination-schemas';

type ResolvePaginationInput = {
  page: number;
  pageSize: number;
  all?: boolean;
};

export function resolvePagination(input: ResolvePaginationInput): {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
} {
  if (input.all) {
    return {
      skip: 0,
      take: Number.MAX_SAFE_INTEGER,
      page: 1,
      pageSize: input.pageSize,
    };
  }

  return {
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
    page: input.page,
    pageSize: input.pageSize,
  };
}

export function buildPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number,
  all = false,
): PaginationMeta {
  if (all) {
    return {
      page: 1,
      pageSize: totalItems,
      totalItems,
      totalPages: 1,
    };
  }

  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

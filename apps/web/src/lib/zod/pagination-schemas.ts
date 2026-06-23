import { z } from "zod";

export const paginationMetaSchema = z.object({
  page: z.number().int().nonnegative(),
  pageSize: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export const DEFAULT_PAGE_SIZE = 10;

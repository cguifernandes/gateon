import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  all: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().nonnegative(),
  pageSize: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

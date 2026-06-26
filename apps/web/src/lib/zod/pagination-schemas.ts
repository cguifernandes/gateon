import { z } from "zod";

export const paginationMetaSchema = z.object({
  page: z.number().int().nonnegative(),
  pageSize: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export const DEFAULT_PAGE_SIZE = 10;
export const GROUPS_TABLE_PAGE_SIZE = 10;
export const MEMBERS_TABLE_PAGE_SIZE = 4;
export const MEMBERS_PER_GROUP_PAGE_SIZE_OPTIONS = [10, 25, 50, 75] as const;
export type MembersPerGroupPageSize =
  (typeof MEMBERS_PER_GROUP_PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_MEMBERS_PER_GROUP_PAGE_SIZE: MembersPerGroupPageSize = 25;
/** @deprecated Use DEFAULT_MEMBERS_PER_GROUP_PAGE_SIZE */
export const MEMBERS_PER_GROUP_PAGE_SIZE = DEFAULT_MEMBERS_PER_GROUP_PAGE_SIZE;

export const membersPaginationMetaSchema = paginationMetaSchema.extend({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

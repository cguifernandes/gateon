import { z } from 'zod';
import { paginationQuerySchema } from './pagination-schemas';

const optionalDateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

export const botStatusFilterSchema = z.enum([
  'all',
  'active',
  'warning',
  'inactive',
  'error',
]);

export const memberStatusFilterSchema = z.enum(['all', 'active', 'left']);

export const telegramGroupsListQuerySchema = paginationQuerySchema.extend({
  view: z.enum(['members']).optional(),
  q: z.string().trim().optional(),
  status: botStatusFilterSchema.optional().default('all'),
  from: optionalDateParam,
  to: optionalDateParam,
  memberStatus: memberStatusFilterSchema.optional().default('all'),
  joinedFrom: optionalDateParam,
  joinedTo: optionalDateParam,
  leftFrom: optionalDateParam,
  leftTo: optionalDateParam,
  telegramChatIds: z.string().trim().optional(),
});

export type TelegramGroupsListQueryInput = z.infer<
  typeof telegramGroupsListQuerySchema
>;

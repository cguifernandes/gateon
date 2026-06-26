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

export const stripePayerFilterSchema = z.enum([
  'all',
  'payer',
  'non_payer',
  'cancel_scheduled',
]);

function parseMembersPagesMap(raw?: string): Record<string, number> {
  if (!raw?.trim()) {
    return {};
  }

  const pages: Record<string, number> = {};
  for (const part of raw.split(',')) {
    const [groupId, pageValue] = part.split(':');
    if (!groupId?.trim() || !pageValue?.trim()) {
      continue;
    }

    const page = Number.parseInt(pageValue, 10);
    if (Number.isFinite(page) && page >= 1) {
      pages[groupId.trim()] = page;
    }
  }

  return pages;
}

export const telegramGroupsListQuerySchema = paginationQuerySchema.extend({
  view: z.enum(['members']).optional(),
  membersPerGroupPageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(75)
    .default(25),
  membersPages: z
    .string()
    .trim()
    .optional()
    .transform((value) => parseMembersPagesMap(value)),
  includeMembersPreview: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  includeTelegramMemberCount: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  includeMemberStripePlans: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value !== 'false'),
  q: z.string().trim().optional(),
  status: botStatusFilterSchema.optional().default('all'),
  from: optionalDateParam,
  to: optionalDateParam,
  memberStatus: memberStatusFilterSchema.optional().default('all'),
  stripePayer: stripePayerFilterSchema.optional().default('all'),
  joinedFrom: optionalDateParam,
  joinedTo: optionalDateParam,
  leftFrom: optionalDateParam,
  leftTo: optionalDateParam,
  telegramChatIds: z.string().trim().optional(),
  stripeConnectionIds: z.string().trim().optional(),
});

export type TelegramGroupsListQueryInput = z.infer<
  typeof telegramGroupsListQuerySchema
>;

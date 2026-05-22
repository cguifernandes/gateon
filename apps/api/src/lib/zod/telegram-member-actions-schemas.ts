import { z } from 'zod';

export const telegramGroupMemberActionSchema = z.enum([
  'notice',
  'remove',
  'ban',
]);

export const telegramGroupMemberBulkActionSchema = z.object({
  action: telegramGroupMemberActionSchema,
  telegramUserIds: z
    .array(z.string().trim().min(1))
    .min(1, 'Select at least one member.')
    .max(100),
  text: z.string().trim().min(1).max(4096).optional(),
});

export type TelegramGroupMemberBulkActionInput = z.infer<
  typeof telegramGroupMemberBulkActionSchema
>;

export const telegramGroupMemberBulkActionResultSchema = z.object({
  successCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  failures: z.array(
    z.object({
      telegramUserId: z.string(),
      reason: z.string(),
    }),
  ),
});

export type TelegramGroupMemberBulkActionResult = z.infer<
  typeof telegramGroupMemberBulkActionResultSchema
>;

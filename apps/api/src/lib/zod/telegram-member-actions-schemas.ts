import { z } from 'zod';

export const telegramGroupMemberActionSchema = z.enum([
  'notice',
  'remove',
  'ban',
]);

export const memberBulkSelectionScopeSchema = z.enum([
  'active_removable',
  'active',
  'all_tracked',
]);

export const telegramGroupMemberBulkActionSchema = z
  .object({
    action: telegramGroupMemberActionSchema,
    telegramUserIds: z
      .array(z.string().trim().min(1))
      .max(100)
      .optional(),
    allMatching: z
      .object({
        scope: memberBulkSelectionScopeSchema,
      })
      .optional(),
    text: z.string().trim().min(1).max(4096).optional(),
  })
  .superRefine((data, ctx) => {
    const hasIds = (data.telegramUserIds?.length ?? 0) > 0;
    const hasAllMatching = Boolean(data.allMatching);

    if (hasIds === hasAllMatching) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide telegramUserIds or allMatching.',
        path: ['telegramUserIds'],
      });
    }
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

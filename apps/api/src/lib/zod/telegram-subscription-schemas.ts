import { z } from 'zod';

export const telegramSubscriptionCancelPortalSchema = z.object({
  telegramUserId: z.string().trim().min(1),
});

export const telegramSubscriptionCancelPortalOptionSchema = z.object({
  url: z.string().url(),
  label: z.string(),
});

export const telegramSubscriptionCancelPortalResponseSchema = z.object({
  options: z.array(telegramSubscriptionCancelPortalOptionSchema).min(1),
});

export type TelegramSubscriptionCancelPortalInput = z.infer<
  typeof telegramSubscriptionCancelPortalSchema
>;
export type TelegramSubscriptionCancelPortalResponse = z.infer<
  typeof telegramSubscriptionCancelPortalResponseSchema
>;

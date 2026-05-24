import { z } from 'zod';

export const telegramGroupChatNoticeRequestSchema = z.object({
  text: z.string().trim().min(1).max(4096).optional(),
});

export type TelegramGroupChatNoticeRequestInput = z.infer<
  typeof telegramGroupChatNoticeRequestSchema
>;

export const telegramGroupChatNoticeResultSchema = z.object({
  sent: z.literal(true),
});

export type TelegramGroupChatNoticeResult = z.infer<
  typeof telegramGroupChatNoticeResultSchema
>;

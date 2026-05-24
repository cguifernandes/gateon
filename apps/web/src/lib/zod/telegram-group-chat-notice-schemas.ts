import { z } from "zod";

export const telegramGroupChatNoticeRequestSchema = z.object({
  text: z.string().trim().min(1).max(4096).optional(),
});

export const telegramGroupChatNoticeResultSchema = z.object({
  sent: z.literal(true),
});

export type TelegramGroupChatNoticeResultDto = z.infer<
  typeof telegramGroupChatNoticeResultSchema
>;

import { z } from "zod";

export const telegramGroupBotSettingsSchema = z.object({
  enabled: z.boolean(),
  notifyPermissionLoss: z.boolean(),
});

export const telegramGroupBotSettingsPatchSchema =
  telegramGroupBotSettingsSchema.partial();

export type TelegramGroupBotSettingsDto = z.infer<
  typeof telegramGroupBotSettingsSchema
>;

export type TelegramGroupBotSettingsPatchInput = z.infer<
  typeof telegramGroupBotSettingsPatchSchema
>;

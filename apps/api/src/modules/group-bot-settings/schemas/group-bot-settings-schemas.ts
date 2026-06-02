import { z } from 'zod';

export const DEFAULT_TELEGRAM_GROUP_WELCOME_MESSAGE =
  'Bem-vindo, {name}! Sua entrada no grupo foi registrada com sucesso.';

export const telegramGroupBotSettingsSchema = z.object({
  enabled: z.boolean(),
  welcomeEnabled: z.boolean(),
  welcomeMessage: z.string().trim().min(1).max(4096),
  privateMessageOnJoin: z.boolean(),
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

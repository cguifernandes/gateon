import { z } from 'zod';

const botStartMessages = {
  welcomeMax: 'A mensagem de boas-vindas deve ter no máximo 4096 caracteres.',
  supportHintMax: 'A dica de suporte deve ter no máximo 500 caracteres.',
  stripeConnectionInvalid: 'Selecione integrações Stripe válidas.',
} as const;

export const PUBLIC_START_TOKEN_PREFIX = 'g_';

export const telegramBotStartSettingsSchema = z.object({
  welcomeMessageEnabled: z.boolean(),
  welcomeMessage: z
    .string()
    .trim()
    .max(4096, botStartMessages.welcomeMax)
    .optional()
    .or(z.literal('')),
  showStripePlans: z.boolean(),
  stripeConnectionIds: z.array(z.string().trim().min(1)).max(50),
  showPaymentButtons: z.boolean(),
  paymentButtonConnectionIds: z.array(z.string().trim().min(1)).max(50),
  paymentButtonsGroupFirst: z.boolean(),
  showSupportHint: z.boolean(),
  supportHintText: z
    .string()
    .trim()
    .max(500, botStartMessages.supportHintMax)
    .optional()
    .or(z.literal('')),
  showSubscribeSteps: z.boolean(),
});

export const telegramBotStartSettingsPatchSchema =
  telegramBotStartSettingsSchema.partial();

const linkedGroupSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
});

export const telegramBotStartSettingsResponseSchema =
  telegramBotStartSettingsSchema.extend({
    publicStartToken: z.string(),
    publicStartUrl: z.string(),
    botUsername: z.string(),
    availableStripeConnections: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        monitoredStripePriceId: z.string().nullable(),
        apiKeyLast4: z.string(),
        linkedGroup: linkedGroupSummarySchema.nullable(),
      }),
    ),
  });

export const telegramBotStartPublicPlanSchema = z.object({
  connectionId: z.string(),
  label: z.string(),
  monitoredStripePriceId: z.string().nullable(),
});

export const telegramBotStartCheckoutButtonsSchema = z.object({
  token: z.string().trim().min(1),
  telegramUserId: z.string().trim().min(1),
  telegramGroupId: z.string().trim().min(1).optional(),
});

export const telegramBotStartPaymentGroupsSchema = z.object({
  token: z.string().trim().min(1),
});

export const telegramBotStartPaymentGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
});

export const telegramBotStartPaymentGroupsResponseSchema = z.object({
  groups: z.array(telegramBotStartPaymentGroupSchema),
});

export const telegramBotStartPublicResponseSchema = z.object({
  welcomeMessageEnabled: z.boolean(),
  welcomeMessage: z.string().nullable(),
  showStripePlans: z.boolean(),
  showPaymentButtons: z.boolean(),
  paymentButtonsGroupFirst: z.boolean(),
  showSupportHint: z.boolean(),
  supportHintText: z.string().nullable(),
  showSubscribeSteps: z.boolean(),
  stripePlans: z.array(telegramBotStartPublicPlanSchema),
});

export type TelegramBotStartSettingsDto = z.infer<
  typeof telegramBotStartSettingsSchema
>;
export type TelegramBotStartSettingsPatchInput = z.infer<
  typeof telegramBotStartSettingsPatchSchema
>;
export type TelegramBotStartSettingsResponseDto = z.infer<
  typeof telegramBotStartSettingsResponseSchema
>;
export type TelegramBotStartPublicResponseDto = z.infer<
  typeof telegramBotStartPublicResponseSchema
>;

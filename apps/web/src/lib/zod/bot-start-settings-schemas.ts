import { z } from "zod";
import { planIdSchema } from "./plan-schemas";

const botStartMessages = {
  welcomeMax: "A mensagem de boas-vindas deve ter no máximo 4096 caracteres.",
  supportHintMax: "A dica de suporte deve ter no máximo 500 caracteres.",
} as const;

export const PUBLIC_START_TOKEN_PREFIX = "g_";

export const telegramBotStartSettingsSchema = z.object({
  welcomeMessageEnabled: z.boolean(),
  welcomeMessage: z
    .string()
    .trim()
    .max(4096, botStartMessages.welcomeMax)
    .optional()
    .or(z.literal("")),
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
    .or(z.literal("")),
  showSubscribeSteps: z.boolean(),
  autoRemoveExpiredSubscribers: z.boolean(),
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
    canUsePaidAutomation: z.boolean(),
    canUseBotCheckout: z.boolean(),
    planId: planIdSchema,
    planLabel: z.string(),
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

export type TelegramBotStartSettingsDto = z.infer<
  typeof telegramBotStartSettingsSchema
>;
export type TelegramBotStartSettingsPatchInput = z.infer<
  typeof telegramBotStartSettingsPatchSchema
>;
export type TelegramBotStartSettingsResponseDto = z.infer<
  typeof telegramBotStartSettingsResponseSchema
>;

export const defaultBotStartSettingsValues = {
  welcomeMessageEnabled: true,
  welcomeMessage:
    "Olá! Bem-vindo(a). Este é o assistente configurado pelo criador do grupo.",
  showStripePlans: false,
  stripeConnectionIds: [],
  showPaymentButtons: false,
  paymentButtonConnectionIds: [],
  paymentButtonsGroupFirst: false,
  showSupportHint: true,
  supportHintText: "",
  showSubscribeSteps: true,
  autoRemoveExpiredSubscribers: false,
} satisfies TelegramBotStartSettingsDto;

import { z } from "zod";
import { stripePaymentGroupLimitSchema } from "./stripe-payment-group-schemas";

const stripeApiKeySchema = z
  .string()
  .trim()
  .min(1, "Informe a chave secreta da Stripe.")
  .refine((value) => value.startsWith("sk_"), {
    message: "Informe uma chave secreta válida da Stripe.",
  });

const stripePriceIdSchema = z
  .string()
  .trim()
  .min(1, "Selecione o plano que deseja monitorar.")
  .refine((value) => value.startsWith("price_"), {
    message: "Selecione um plano válido da Stripe.",
  });

export const stripeBillingPreviewCatalogSchema = z.object({
  apiKey: stripeApiKeySchema,
});

export const stripeBillingConnectSchema = z.object({
  apiKey: stripeApiKeySchema,
  stripePriceId: stripePriceIdSchema,
  telegramGroupId: z
    .string()
    .trim()
    .min(1, "Selecione o grupo vinculado ao plano."),
  consentAccepted: z.literal(true, {
    error: "É necessário aceitar o aviso de consentimento.",
  }),
});

export const stripeBillingUpdateLinkedGroupSchema = z.object({
  telegramGroupId: z
    .string()
    .trim()
    .min(1, "Selecione o grupo vinculado ao plano."),
});

export const stripeCatalogPriceSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productDescription: z.string().nullable(),
  nickname: z.string().nullable(),
  unitAmountCents: z.number().nullable(),
  currency: z.string(),
  interval: z.string().nullable(),
  intervalCount: z.number().nullable(),
  label: z.string(),
  priceLabel: z.string().nullable(),
});

export const stripeBillingCatalogSchema = z.object({
  prices: z.array(stripeCatalogPriceSchema),
});

const linkedGroupSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
});

export const stripeBillingConnectionSchema = z.object({
  id: z.string(),
  stripeAccountId: z.string().nullable(),
  apiKeyLast4: z.string(),
  status: z.enum(["CONNECTED", "DISCONNECTED", "FAILED"]),
  lastSyncedAt: z.string().nullable().or(z.date().nullable()),
  consentAcceptedAt: z.string().or(z.date()),
  disconnectedAt: z.string().nullable().or(z.date().nullable()),
  activeSubscriptionCount: z.number(),
  expiringSubscriptionCount: z.number(),
  expiredSubscriptionCount: z.number(),
  customerCount: z.number(),
  monthlyRevenueCents: z.number(),
  receivedPaymentCount: z.number(),
  failedPaymentCount: z.number(),
  monitoredStripePriceId: z.string().nullable(),
  monitoredStripeProductId: z.string().nullable(),
  monitoredPlanLabel: z.string().nullable(),
  telegramGroupId: z.string().nullable(),
  linkedGroup: linkedGroupSummarySchema.nullable(),
  updatedAt: z.string().or(z.date()),
});

export const stripeBillingTotalsSchema = z.object({
  activeSubscriptionCount: z.number(),
  expiringSubscriptionCount: z.number(),
  expiredSubscriptionCount: z.number(),
  customerCount: z.number(),
  monthlyRevenueCents: z.number(),
  receivedPaymentCount: z.number(),
  failedPaymentCount: z.number(),
});

export const stripeBillingStatusSchema = z.object({
  connected: z.boolean(),
  canConnect: z.boolean(),
  connections: z.array(stripeBillingConnectionSchema),
  totals: stripeBillingTotalsSchema,
  stripePaymentGroupLimit: stripePaymentGroupLimitSchema,
});

export type StripeBillingPreviewCatalogInput = z.infer<
  typeof stripeBillingPreviewCatalogSchema
>;
export type StripeBillingConnectInput = z.infer<
  typeof stripeBillingConnectSchema
>;
export type StripeBillingUpdateLinkedGroupInput = z.infer<
  typeof stripeBillingUpdateLinkedGroupSchema
>;
export type StripeCatalogPriceDto = z.infer<typeof stripeCatalogPriceSchema>;
export type StripeBillingCatalogDto = z.infer<
  typeof stripeBillingCatalogSchema
>;
export type StripeBillingConnectionDto = z.infer<
  typeof stripeBillingConnectionSchema
>;
export type StripeBillingTotalsDto = z.infer<typeof stripeBillingTotalsSchema>;
export type StripeBillingStatusDto = z.infer<typeof stripeBillingStatusSchema>;

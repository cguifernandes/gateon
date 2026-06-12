import { z } from 'zod';

const stripeApiKeySchema = z
  .string()
  .trim()
  .min(1, 'Informe a chave secreta.')
  .refine((value) => value.startsWith('sk_'), {
    message: 'Informe uma chave secreta válida.',
  });

const stripePriceIdSchema = z
  .string()
  .trim()
  .min(1, 'Selecione o plano que deseja monitorar.')
  .refine((value) => value.startsWith('price_'), {
    message: 'Informe um preço válido da Stripe.',
  });

const stripeMessages = {
  consentRequired: 'É necessário aceitar o aviso.',
} as const;

export const stripeBillingPreviewCatalogSchema = z.object({
  apiKey: stripeApiKeySchema,
});

export const stripeBillingConnectSchema = z.object({
  apiKey: stripeApiKeySchema,
  stripePriceId: stripePriceIdSchema,
  consentAccepted: z.literal(true, {
    errorMap: () => ({ message: stripeMessages.consentRequired }),
  }),
});

export const stripeBillingCatalogPriceSchema = z.object({
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
  prices: z.array(stripeBillingCatalogPriceSchema),
});

export type StripeBillingPreviewCatalogInput = z.infer<
  typeof stripeBillingPreviewCatalogSchema
>;
export type StripeBillingConnectInput = z.infer<
  typeof stripeBillingConnectSchema
>;
export type StripeBillingCatalogPrice = z.infer<
  typeof stripeBillingCatalogPriceSchema
>;

import { z } from 'zod';

export const stripeProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  active: z.boolean(),
});

export type StripeProduct = z.infer<typeof stripeProductSchema>;

export const stripePriceSchema = z.object({
  id: z.string(),
  productId: z.string(),
  currency: z.string(),
  unitAmount: z.number().nullable(),
  unitAmountDecimal: z.string().nullable(),
  type: z.enum(['one_time', 'recurring']),
  recurringInterval: z.enum(['day', 'week', 'month', 'year']).nullable(),
  recurringIntervalCount: z.number().nullable(),
  active: z.boolean(),
});

export type StripePrice = z.infer<typeof stripePriceSchema>;

export const stripeProductWithPricesSchema = stripeProductSchema.extend({
  prices: z.array(stripePriceSchema),
});

export type StripeProductWithPrices = z.infer<
  typeof stripeProductWithPricesSchema
>;

export const createCheckoutSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export const checkoutSessionSchema = z.object({
  url: z.string().url(),
});

export type CheckoutSessionDto = z.infer<typeof checkoutSessionSchema>;

export const createPortalSchema = z.object({
  returnUrl: z.string().url(),
});

export type CreatePortalInput = z.infer<typeof createPortalSchema>;

export const customerPortalSchema = z.object({
  url: z.string().url(),
});

export type CustomerPortalDto = z.infer<typeof customerPortalSchema>;

export const billingSubscriptionSchema = z.object({
  planId: z.enum(['free', 'starter', 'pro']),
  status: z.string(),
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
});

export type BillingSubscriptionDto = z.infer<typeof billingSubscriptionSchema>;

export const webhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.unknown(),
  }),
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;

export const availablePlanSchema = z.object({
  id: z.string(),
  planId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  currency: z.string(),
  interval: z.string().nullable(),
  intervalCount: z.number().nullable(),
  features: z.array(z.string()),
  isHighlight: z.boolean().default(false),
});

export type AvailablePlan = z.infer<typeof availablePlanSchema>;

export const planIdSchema = z.enum(['free', 'starter', 'pro']);
export type PlanId = z.infer<typeof planIdSchema>;

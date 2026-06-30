import { z } from "zod";

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

export const createCheckoutSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export const billingSubscriptionSchema = z.object({
  planId: z.enum(["free", "starter", "pro"]),
  status: z.string(),
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
});

export type BillingSubscriptionDto = z.infer<typeof billingSubscriptionSchema>;

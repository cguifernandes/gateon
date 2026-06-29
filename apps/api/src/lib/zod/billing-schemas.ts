import { z } from 'zod';

export const billingPlanSchema = z.enum(['starter', 'pro']);

export type BillingPlan = z.infer<typeof billingPlanSchema>;

export const createCheckoutSchema = z.object({
  plan: billingPlanSchema,
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export const createPortalSchema = z.object({});

export type CreatePortalInput = z.infer<typeof createPortalSchema>;

export const billingSubscriptionSchema = z.object({
  planId: z.enum(['free', 'starter', 'pro']),
  status: z.string(),
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
});

export type BillingSubscriptionDto = z.infer<typeof billingSubscriptionSchema>;

export const checkoutSessionSchema = z.object({
  url: z.string().url(),
});

export type CheckoutSessionDto = z.infer<typeof checkoutSessionSchema>;

export const customerPortalSchema = z.object({
  url: z.string().url(),
});

export type CustomerPortalDto = z.infer<typeof customerPortalSchema>;

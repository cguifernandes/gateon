import { AlertTriggerType } from '@prisma/client';

export type SubscriptionAutomationDedupeInput = {
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export function buildSubscriptionAutomationDedupeKey(
  triggerType: AlertTriggerType,
  input: SubscriptionAutomationDedupeInput,
): string {
  const period = input.currentPeriodEnd?.toISOString() ?? 'none';

  switch (triggerType) {
    case AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED:
      return input.cancelAtPeriodEnd
        ? `subscription:CANCELED:scheduled:${input.stripeSubscriptionId}:${period}`
        : `subscription:CANCELED:immediate:${input.stripeSubscriptionId}`;
    case AlertTriggerType.STRIPE_SUBSCRIPTION_RENEWED:
      return `subscription:RENEWED:${input.stripeSubscriptionId}:${period}`;
    case AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING:
      return `subscription:EXPIRING:${input.stripeSubscriptionId}:${period}`;
    default:
      return `subscription:${triggerType}:${input.stripeSubscriptionId}`;
  }
}

export function buildInvoiceAutomationDedupeKey(
  triggerType: AlertTriggerType,
  stripeInvoiceId: string,
): string {
  return `invoice:${triggerType}:${stripeInvoiceId}`;
}

export function shouldDispatchStripeAutomation(
  lastAutomationDedupeKey: string | null | undefined,
  dedupeKey: string,
): boolean {
  return lastAutomationDedupeKey !== dedupeKey;
}

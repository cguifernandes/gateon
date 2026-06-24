import { AlertTriggerType } from '@prisma/client';

export const STRIPE_EXPIRING_WINDOW_DAYS = 7;

export type SubscriptionSnapshot = {
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd?: boolean;
  lastEventType?: string | null;
};

export function isSubscriptionExpiringSoon(
  status: string,
  currentPeriodEnd: Date | null,
  nowMs: number = Date.now(),
): boolean {
  if (!currentPeriodEnd || (status !== 'active' && status !== 'trialing')) {
    return false;
  }

  const end = currentPeriodEnd.getTime();
  const windowMs = STRIPE_EXPIRING_WINDOW_DAYS * 86_400_000;
  return end >= nowMs && end <= nowMs + windowMs;
}

function isSamePeriodEnd(
  left: Date | null | undefined,
  right: Date | null,
): boolean {
  if (!left || !right) {
    return false;
  }
  return left.getTime() === right.getTime();
}

export function resolveSubscriptionStripeTrigger(
  existing: SubscriptionSnapshot | null,
  status: string,
  currentPeriodEnd: Date | null,
  cancelAtPeriodEnd = false,
  nowMs: number = Date.now(),
): AlertTriggerType | null {
  if (!existing && status === 'canceled') {
    return AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED;
  }

  if (existing?.status !== status) {
    if (status === 'canceled') {
      if (existing?.cancelAtPeriodEnd) {
        return AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED;
      }
      return AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED;
    }
    if (status === 'unpaid' || status === 'incomplete_expired') {
      return AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED;
    }
  }

  if (
    cancelAtPeriodEnd &&
    !existing?.cancelAtPeriodEnd &&
    (status === 'active' || status === 'trialing')
  ) {
    return AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED;
  }

  if (cancelAtPeriodEnd && (status === 'active' || status === 'trialing')) {
    return null;
  }

  if (
    existing?.currentPeriodEnd &&
    currentPeriodEnd &&
    currentPeriodEnd > existing.currentPeriodEnd &&
    (status === 'active' || status === 'trialing')
  ) {
    return AlertTriggerType.STRIPE_SUBSCRIPTION_RENEWED;
  }

  if (!isSubscriptionExpiringSoon(status, currentPeriodEnd, nowMs)) {
    return null;
  }

  if (
    existing?.lastEventType === AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING &&
    isSamePeriodEnd(existing.currentPeriodEnd, currentPeriodEnd)
  ) {
    return null;
  }

  return AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING;
}

export function resolveInvoicePaymentTrigger(
  status: string,
  stripeWebhookEventType?: string,
): AlertTriggerType | null {
  if (status === 'paid') {
    return AlertTriggerType.STRIPE_PAYMENT_SUCCEEDED;
  }
  if (status === 'uncollectible' || status === 'void') {
    return AlertTriggerType.STRIPE_PAYMENT_FAILED;
  }
  if (stripeWebhookEventType === 'invoice.payment_failed') {
    return AlertTriggerType.STRIPE_PAYMENT_FAILED;
  }
  return null;
}

export const STRIPE_SUBSCRIPTION_AUDIT_ACTION_BY_TRIGGER: Partial<
  Record<AlertTriggerType, string>
> = {
  STRIPE_SUBSCRIPTION_EXPIRING: 'SUBSCRIPTION_EXPIRING',
  STRIPE_SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  STRIPE_SUBSCRIPTION_CANCELED: 'SUBSCRIPTION_CANCELED',
  STRIPE_SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
};

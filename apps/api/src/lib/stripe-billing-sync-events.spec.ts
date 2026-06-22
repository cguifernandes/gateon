import { AlertTriggerType } from '@prisma/client';
import {
  isSubscriptionExpiringSoon,
  resolveInvoicePaymentTrigger,
  resolveSubscriptionStripeTrigger,
  STRIPE_EXPIRING_WINDOW_DAYS,
} from './stripe-billing-sync-events';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-06-21T12:00:00.000Z').getTime();

function daysFromNow(days: number): Date {
  return new Date(NOW + days * DAY_MS);
}

describe('resolveInvoicePaymentTrigger', () => {
  it('maps paid invoices to STRIPE_PAYMENT_SUCCEEDED', () => {
    expect(resolveInvoicePaymentTrigger('paid')).toBe(
      AlertTriggerType.STRIPE_PAYMENT_SUCCEEDED,
    );
  });

  it('maps uncollectible invoices to STRIPE_PAYMENT_FAILED', () => {
    expect(resolveInvoicePaymentTrigger('uncollectible')).toBe(
      AlertTriggerType.STRIPE_PAYMENT_FAILED,
    );
  });

  it('maps void invoices to STRIPE_PAYMENT_FAILED', () => {
    expect(resolveInvoicePaymentTrigger('void')).toBe(
      AlertTriggerType.STRIPE_PAYMENT_FAILED,
    );
  });

  it('ignores open and draft invoices', () => {
    expect(resolveInvoicePaymentTrigger('open')).toBeNull();
    expect(resolveInvoicePaymentTrigger('draft')).toBeNull();
  });

  it('maps invoice.payment_failed webhook events to STRIPE_PAYMENT_FAILED', () => {
    expect(
      resolveInvoicePaymentTrigger('open', 'invoice.payment_failed'),
    ).toBe(AlertTriggerType.STRIPE_PAYMENT_FAILED);
  });
});

describe('isSubscriptionExpiringSoon', () => {
  it('returns true when period ends within the expiring window', () => {
    expect(
      isSubscriptionExpiringSoon(
        'active',
        daysFromNow(STRIPE_EXPIRING_WINDOW_DAYS - 1),
        NOW,
      ),
    ).toBe(true);
  });

  it('returns false when period end is beyond the window', () => {
    expect(
      isSubscriptionExpiringSoon(
        'active',
        daysFromNow(STRIPE_EXPIRING_WINDOW_DAYS + 1),
        NOW,
      ),
    ).toBe(false);
  });

  it('returns false for canceled subscriptions even inside the window', () => {
    expect(
      isSubscriptionExpiringSoon('canceled', daysFromNow(2), NOW),
    ).toBe(false);
  });
});

describe('resolveSubscriptionStripeTrigger', () => {
  it('detects new canceled subscription', () => {
    expect(
      resolveSubscriptionStripeTrigger(null, 'canceled', null, NOW),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });

  it('detects transition to canceled', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromNow(10) },
        'canceled',
        daysFromNow(10),
        NOW,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });

  it('detects transition to unpaid as expired', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromNow(1) },
        'unpaid',
        daysFromNow(1),
        NOW,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED);
  });

  it('detects transition to incomplete_expired as expired', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'past_due', currentPeriodEnd: daysFromNow(1) },
        'incomplete_expired',
        daysFromNow(1),
        NOW,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED);
  });

  it('detects renewal when current period end advances', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromNow(5) },
        'active',
        daysFromNow(35),
        NOW,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_RENEWED);
  });

  it('detects expiring subscription near period end', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromNow(3) },
        'active',
        daysFromNow(3),
        NOW,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING);
  });

  it('returns null when subscription is stable and not expiring soon', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromNow(30) },
        'active',
        daysFromNow(30),
        NOW,
      ),
    ).toBeNull();
  });

  it('prioritizes status change over expiring window', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromNow(2) },
        'canceled',
        daysFromNow(2),
        NOW,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });
});

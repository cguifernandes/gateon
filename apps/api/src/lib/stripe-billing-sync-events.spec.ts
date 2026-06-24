import { AlertTriggerType } from '@prisma/client';
import {
  isSubscriptionExpiringSoon,
  resolveInvoicePaymentTrigger,
  resolveSubscriptionStripeTrigger,
  shouldDispatchInvoicePaymentTrigger,
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

describe('shouldDispatchInvoicePaymentTrigger', () => {
  it('dispatches new paid invoices during manual sync', () => {
    expect(
      shouldDispatchInvoicePaymentTrigger(
        AlertTriggerType.STRIPE_PAYMENT_SUCCEEDED,
        undefined,
        'paid',
      ),
    ).toBe(true);
  });

  it('does not dispatch unseen draft invoices during manual sync', () => {
    expect(
      shouldDispatchInvoicePaymentTrigger(
        AlertTriggerType.STRIPE_PAYMENT_SUCCEEDED,
        undefined,
        'draft',
      ),
    ).toBe(false);
  });

  it('does not repeat paid alerts when invoice status is unchanged', () => {
    expect(
      shouldDispatchInvoicePaymentTrigger(
        AlertTriggerType.STRIPE_PAYMENT_SUCCEEDED,
        'paid',
        'paid',
      ),
    ).toBe(false);
  });

  it('dispatches first webhook observation even when status is unchanged', () => {
    expect(
      shouldDispatchInvoicePaymentTrigger(
        AlertTriggerType.STRIPE_PAYMENT_SUCCEEDED,
        undefined,
        'paid',
        { stripeWebhookEventType: 'invoice.paid' },
      ),
    ).toBe(true);
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
      resolveSubscriptionStripeTrigger(null, 'canceled', null, false, NOW),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });

  it('detects transition to canceled', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromNow(10) },
        'canceled',
        daysFromNow(10),
        false,
        NOW,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });

  it('maps scheduled cancel ending to expired', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        {
          status: 'active',
          currentPeriodEnd: daysFromNow(1),
          cancelAtPeriodEnd: true,
        },
        'canceled',
        daysFromNow(1),
        false,
        NOW,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED);
  });

  it('detects transition to unpaid as expired', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromNow(1) },
        'unpaid',
        daysFromNow(1),
        false,
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
        false,
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
        false,
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
        false,
        NOW,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING);
  });

  it('does not repeat expiring alerts for the same billing period', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        {
          status: 'active',
          currentPeriodEnd: daysFromNow(3),
          lastEventType: AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING,
        },
        'active',
        daysFromNow(3),
        false,
        NOW,
      ),
    ).toBeNull();
  });

  it('detects scheduled cancellation at period end', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromNow(10) },
        'active',
        daysFromNow(10),
        true,
        NOW,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });

  it('suppresses duplicate alerts while cancellation is scheduled', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        {
          status: 'active',
          currentPeriodEnd: daysFromNow(2),
          cancelAtPeriodEnd: true,
        },
        'active',
        daysFromNow(2),
        true,
        NOW,
      ),
    ).toBeNull();
  });

  it('does not treat scheduled cancellation as expiring soon', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromNow(2) },
        'active',
        daysFromNow(2),
        true,
        NOW,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });

  it('returns null when subscription is stable and not expiring soon', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromNow(30) },
        'active',
        daysFromNow(30),
        false,
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
        false,
        NOW,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });
});

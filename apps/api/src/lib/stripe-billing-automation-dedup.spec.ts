import { AlertTriggerType } from '@prisma/client';
import {
  buildInvoiceAutomationDedupeKey,
  buildSubscriptionAutomationDedupeKey,
  shouldDispatchStripeAutomation,
} from './stripe-billing-automation-dedup';

const PERIOD = new Date('2026-07-01T00:00:00.000Z');

describe('stripe billing automation dedup', () => {
  describe('buildSubscriptionAutomationDedupeKey', () => {
    it('builds distinct keys for scheduled cancel and expiration', () => {
      const scheduled = buildSubscriptionAutomationDedupeKey(
        AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED,
        {
          stripeSubscriptionId: 'sub_1',
          status: 'active',
          currentPeriodEnd: PERIOD,
          cancelAtPeriodEnd: true,
        },
      );
      const expired = buildSubscriptionAutomationDedupeKey(
        AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED,
        {
          stripeSubscriptionId: 'sub_1',
          status: 'canceled',
          currentPeriodEnd: PERIOD,
          cancelAtPeriodEnd: true,
        },
      );

      expect(scheduled).not.toBe(expired);
    });

    it('reuses the same key for repeated expiring alerts in the same period', () => {
      const first = buildSubscriptionAutomationDedupeKey(
        AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING,
        {
          stripeSubscriptionId: 'sub_1',
          status: 'active',
          currentPeriodEnd: PERIOD,
          cancelAtPeriodEnd: false,
        },
      );
      const second = buildSubscriptionAutomationDedupeKey(
        AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING,
        {
          stripeSubscriptionId: 'sub_1',
          status: 'active',
          currentPeriodEnd: PERIOD,
          cancelAtPeriodEnd: false,
        },
      );

      expect(first).toBe(second);
    });
  });

  describe('buildInvoiceAutomationDedupeKey', () => {
    it('maps one invoice to one payment alert key', () => {
      expect(
        buildInvoiceAutomationDedupeKey(
          AlertTriggerType.STRIPE_PAYMENT_SUCCEEDED,
          'inv_123',
        ),
      ).toBe('invoice:STRIPE_PAYMENT_SUCCEEDED:inv_123');
    });
  });

  describe('shouldDispatchStripeAutomation', () => {
    it('allows the first dispatch for a dedupe key', () => {
      expect(shouldDispatchStripeAutomation(null, 'invoice:paid:inv_1')).toBe(
        true,
      );
    });

    it('blocks duplicate dispatches for the same dedupe key', () => {
      expect(
        shouldDispatchStripeAutomation(
          'invoice:paid:inv_1',
          'invoice:paid:inv_1',
        ),
      ).toBe(false);
    });
  });
});

/**
 * Stripe billing module tests (integration checks skipped without DATABASE_URL).
 */
import { createHmac } from 'node:crypto';
import { resolve } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { config as loadDotenv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  AlertDestinationType,
  AlertStatus,
  AlertTriggerType,
  StripeTelegramMemberLinkStatus,
  type StripeBillingAuditAction,
} from '@prisma/client';
import { resolvePrismaRuntimePoolConfig } from '../../lib/prisma/database-connection';
import {
  buildInvoiceAutomationDedupeKey,
  buildSubscriptionAutomationDedupeKey,
  shouldDispatchStripeAutomation,
} from '../../lib/stripe/billing-automation-dedup';
import {
  buildStripeWebhookEndpointUrl,
  resolveStripeWebhookPublicBaseUrl,
} from '../../lib/stripe/webhook-url';
import {
  isSubscriptionExpiringSoon,
  resolveInvoicePaymentTrigger,
  resolveSubscriptionStripeTrigger,
  shouldDispatchInvoicePaymentTrigger,
  STRIPE_EXPIRING_WINDOW_DAYS,
} from '../../lib/stripe/billing-sync-events';
import {
  isLocalOnlyWebBaseUrl,
  resolveStripeCheckoutRedirectUrls,
} from '../../lib/stripe/checkout-redirect';
import {
  processInvoiceStripeEvent,
  processSubscriptionStripeEvent,
  type StripeAutomationDispatchDeps,
} from '../../lib/stripe/billing-alert-dispatch';
import {
  canOpenStripeSubscriptionCancelPortal,
  isEntitledStripeSubscription,
  isManageableStripeSubscriptionForCancel,
  isStripeSubscriptionCancelScheduled,
  memberHasStripeCancelScheduled,
  pickStripeSubscriptionForCancel,
  resolveStripePayerSubscriptionForLink,
  shouldRevokeStripeTelegramMemberLink,
  shouldRevokeStripeTelegramMemberLinkForSubscription,
  showsStripePayerBadge,
} from '../../lib/stripe/telegram-member-links';
import { resolveStripeLinkedTelegramSubscriber } from '../../lib/stripe/telegram-subscriber';
import { verifyStripeWebhookSignature } from '../../lib/stripe/webhook-signature';
import { AlertsService } from '../alerts/alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { StripeBillingService } from './stripe-billing.service';
import {
  ALL_STRIPE_ALERT_TRIGGERS,
  cleanupStripeIntegrationAlerts,
  countAlertRuns,
  loadStripeIntegrationFixture,
  type StripeIntegrationFixture,
} from '../../testing/stripe-alert-test-fixtures';

loadDotenv({ path: resolve(__dirname, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL?.trim();
const describeWithDb = databaseUrl ? describe : describe.skip;

function createPrismaClient() {
  const adapter = new PrismaPg(resolvePrismaRuntimePoolConfig());
  return new PrismaClient({ adapter });
}

function createWebhookConfig(
  values: Record<string, string | undefined>,
): Pick<ConfigService, 'get'> {
  return {
    get: (key: string) => values[key],
  };
}

function signStripeWebhookPayload(
  secret: string,
  payload: string,
  timestamp: number,
) {
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

describe('resolveStripeWebhookPublicBaseUrl', () => {
  it('prefers API_PUBLIC_BASE_URL', () => {
    const config = createWebhookConfig({
      API_PUBLIC_BASE_URL: 'https://api.gateon.com/',
      NODE_ENV: 'production',
      PORT: '4000',
    });

    expect(resolveStripeWebhookPublicBaseUrl(config)).toBe(
      'https://api.gateon.com',
    );
  });

  it('uses x-gateon-api-public-base-url when env is missing', () => {
    const config = createWebhookConfig({
      NODE_ENV: 'production',
      PORT: '4000',
    });

    expect(
      resolveStripeWebhookPublicBaseUrl(config, {
        'x-gateon-api-public-base-url': 'https://gateon-api.onrender.com',
      }),
    ).toBe('https://gateon-api.onrender.com');
  });

  it('falls back to localhost only outside production', () => {
    const config = createWebhookConfig({
      NODE_ENV: 'development',
      PORT: '4000',
    });

    expect(resolveStripeWebhookPublicBaseUrl(config)).toBe(
      'http://localhost:4000',
    );
  });
});

describe('buildStripeWebhookEndpointUrl', () => {
  it('builds the per-connection webhook path', () => {
    const config = createWebhookConfig({
      API_PUBLIC_BASE_URL: 'https://api.test',
    });

    expect(buildStripeWebhookEndpointUrl(config, 'conn-1')).toBe(
      'https://api.test/stripe-billing/webhooks/conn-1',
    );
  });
});

describe('stripe billing automation dedup', () => {
  const period = new Date('2026-07-01T00:00:00.000Z');

  describe('buildSubscriptionAutomationDedupeKey', () => {
    it('builds distinct keys for scheduled cancel and expiration', () => {
      const scheduled = buildSubscriptionAutomationDedupeKey(
        AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED,
        {
          stripeSubscriptionId: 'sub_1',
          status: 'active',
          currentPeriodEnd: period,
          cancelAtPeriodEnd: true,
        },
      );
      const expired = buildSubscriptionAutomationDedupeKey(
        AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED,
        {
          stripeSubscriptionId: 'sub_1',
          status: 'canceled',
          currentPeriodEnd: period,
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
          currentPeriodEnd: period,
          cancelAtPeriodEnd: false,
        },
      );
      const second = buildSubscriptionAutomationDedupeKey(
        AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING,
        {
          stripeSubscriptionId: 'sub_1',
          status: 'active',
          currentPeriodEnd: period,
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

describe('verifyStripeWebhookSignature', () => {
  const secret = 'whsec_test_secret';
  const payload = '{"id":"evt_test"}';

  it('accepts a valid signature', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = signStripeWebhookPayload(secret, payload, timestamp);

    expect(verifyStripeWebhookSignature(payload, header, secret)).toBe(true);
  });

  it('rejects invalid signatures', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = `t=${timestamp},v1=deadbeef`;

    expect(verifyStripeWebhookSignature(payload, header, secret)).toBe(false);
  });
});

describe('isLocalOnlyWebBaseUrl', () => {
  it('detects localhost hosts', () => {
    expect(isLocalOnlyWebBaseUrl('http://localhost:3000')).toBe(true);
    expect(isLocalOnlyWebBaseUrl('http://127.0.0.1:3000')).toBe(true);
  });

  it('accepts public hosts', () => {
    expect(isLocalOnlyWebBaseUrl('https://abc.ngrok-free.app')).toBe(false);
    expect(isLocalOnlyWebBaseUrl('https://app.gateon.com')).toBe(false);
  });
});

describe('resolveStripeCheckoutRedirectUrls', () => {
  const botUrl = 'https://t.me/GateonBot';

  it('uses public override for mobile local testing', () => {
    const result = resolveStripeCheckoutRedirectUrls({
      webBaseUrl: 'http://localhost:3000',
      publicBaseUrl: 'https://abc.ngrok-free.app',
      telegramBotPublicUrl: botUrl,
      isProduction: false,
    });

    expect(result.mode).toBe('public_web');
    expect(result.successUrl).toContain(
      'abc.ngrok-free.app/stripe/checkout/success',
    );
    expect(result.shouldAutoReconcile).toBe(false);
  });

  it('falls back to Telegram and auto-reconcile in local development', () => {
    const result = resolveStripeCheckoutRedirectUrls({
      webBaseUrl: 'http://localhost:3000',
      telegramBotPublicUrl: botUrl,
      isProduction: false,
    });

    expect(result.mode).toBe('telegram_fallback');
    expect(result.successUrl).toBe(botUrl);
    expect(result.cancelUrl).toBe(botUrl);
    expect(result.shouldAutoReconcile).toBe(true);
  });

  it('keeps web URLs in production even when base is localhost', () => {
    const result = resolveStripeCheckoutRedirectUrls({
      webBaseUrl: 'http://localhost:3000',
      telegramBotPublicUrl: botUrl,
      isProduction: true,
    });

    expect(result.mode).toBe('local_web');
    expect(result.successUrl).toContain(
      'localhost:3000/stripe/checkout/success',
    );
    expect(result.shouldAutoReconcile).toBe(false);
  });
});

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
    expect(resolveInvoicePaymentTrigger('open', 'invoice.payment_failed')).toBe(
      AlertTriggerType.STRIPE_PAYMENT_FAILED,
    );
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
  const syncNow = new Date('2026-06-21T12:00:00.000Z').getTime();
  const dayMs = 86_400_000;

  function daysFromSyncNow(days: number): Date {
    return new Date(syncNow + days * dayMs);
  }

  it('returns true when period ends within the expiring window', () => {
    expect(
      isSubscriptionExpiringSoon(
        'active',
        daysFromSyncNow(STRIPE_EXPIRING_WINDOW_DAYS - 1),
        syncNow,
      ),
    ).toBe(true);
  });

  it('returns false when period end is beyond the window', () => {
    expect(
      isSubscriptionExpiringSoon(
        'active',
        daysFromSyncNow(STRIPE_EXPIRING_WINDOW_DAYS + 1),
        syncNow,
      ),
    ).toBe(false);
  });

  it('returns false for canceled subscriptions even inside the window', () => {
    expect(
      isSubscriptionExpiringSoon('canceled', daysFromSyncNow(2), syncNow),
    ).toBe(false);
  });
});

describe('resolveSubscriptionStripeTrigger', () => {
  const syncNow = new Date('2026-06-21T12:00:00.000Z').getTime();
  const dayMs = 86_400_000;

  function daysFromSyncNow(days: number): Date {
    return new Date(syncNow + days * dayMs);
  }

  it('detects new canceled subscription', () => {
    expect(
      resolveSubscriptionStripeTrigger(null, 'canceled', null, false, syncNow),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });

  it('detects transition to canceled', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromSyncNow(10) },
        'canceled',
        daysFromSyncNow(10),
        false,
        syncNow,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });

  it('maps scheduled cancel ending to expired', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        {
          status: 'active',
          currentPeriodEnd: daysFromSyncNow(1),
          cancelAtPeriodEnd: true,
        },
        'canceled',
        daysFromSyncNow(1),
        false,
        syncNow,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED);
  });

  it('detects transition to unpaid as expired', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromSyncNow(1) },
        'unpaid',
        daysFromSyncNow(1),
        false,
        syncNow,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED);
  });

  it('detects transition to incomplete_expired as expired', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'past_due', currentPeriodEnd: daysFromSyncNow(1) },
        'incomplete_expired',
        daysFromSyncNow(1),
        false,
        syncNow,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED);
  });

  it('detects renewal when current period end advances', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromSyncNow(5) },
        'active',
        daysFromSyncNow(35),
        false,
        syncNow,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_RENEWED);
  });

  it('detects expiring subscription near period end', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromSyncNow(3) },
        'active',
        daysFromSyncNow(3),
        false,
        syncNow,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING);
  });

  it('does not repeat expiring alerts for the same billing period', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        {
          status: 'active',
          currentPeriodEnd: daysFromSyncNow(3),
          lastEventType: AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING,
        },
        'active',
        daysFromSyncNow(3),
        false,
        syncNow,
      ),
    ).toBeNull();
  });

  it('detects scheduled cancellation at period end', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromSyncNow(10) },
        'active',
        daysFromSyncNow(10),
        true,
        syncNow,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });

  it('suppresses duplicate alerts while cancellation is scheduled', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        {
          status: 'active',
          currentPeriodEnd: daysFromSyncNow(2),
          cancelAtPeriodEnd: true,
        },
        'active',
        daysFromSyncNow(2),
        true,
        syncNow,
      ),
    ).toBeNull();
  });

  it('does not treat scheduled cancellation as expiring soon', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromSyncNow(2) },
        'active',
        daysFromSyncNow(2),
        true,
        syncNow,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });

  it('returns null when subscription is stable and not expiring soon', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromSyncNow(30) },
        'active',
        daysFromSyncNow(30),
        false,
        syncNow,
      ),
    ).toBeNull();
  });

  it('prioritizes status change over expiring window', () => {
    expect(
      resolveSubscriptionStripeTrigger(
        { status: 'active', currentPeriodEnd: daysFromSyncNow(2) },
        'canceled',
        daysFromSyncNow(2),
        false,
        syncNow,
      ),
    ).toBe(AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED);
  });
});

describe('stripe telegram member links', () => {
  describe('isEntitledStripeSubscription', () => {
    it('returns true for active subscriptions', () => {
      expect(isEntitledStripeSubscription({ status: 'active' })).toBe(true);
    });

    it('returns true for trialing subscriptions', () => {
      expect(isEntitledStripeSubscription({ status: 'trialing' })).toBe(true);
    });

    it('returns false for canceled subscriptions', () => {
      expect(isEntitledStripeSubscription({ status: 'canceled' })).toBe(false);
    });

    it('returns false when subscription is missing', () => {
      expect(isEntitledStripeSubscription(null)).toBe(false);
    });
  });

  describe('shouldRevokeStripeTelegramMemberLink', () => {
    it('revokes canceled subscriptions', () => {
      expect(shouldRevokeStripeTelegramMemberLink('canceled')).toBe(true);
    });

    it('keeps active subscriptions', () => {
      expect(shouldRevokeStripeTelegramMemberLink('active')).toBe(false);
    });

    it('keeps trialing subscriptions', () => {
      expect(shouldRevokeStripeTelegramMemberLink('trialing')).toBe(false);
    });
  });

  describe('showsStripePayerBadge', () => {
    it('shows badge for active subscriptions', () => {
      expect(
        showsStripePayerBadge({ status: 'active', cancelAtPeriodEnd: false }),
      ).toBe(true);
    });

    it('shows badge when cancel is scheduled at period end', () => {
      expect(
        showsStripePayerBadge({ status: 'active', cancelAtPeriodEnd: true }),
      ).toBe(true);
    });

    it('hides badge for canceled subscriptions', () => {
      expect(showsStripePayerBadge({ status: 'canceled' })).toBe(false);
    });
  });

  describe('isStripeSubscriptionCancelScheduled', () => {
    it('detects active subscriptions scheduled to cancel', () => {
      expect(
        isStripeSubscriptionCancelScheduled({
          status: 'active',
          cancelAtPeriodEnd: true,
        }),
      ).toBe(true);
    });

    it('ignores active subscriptions without scheduled cancel', () => {
      expect(
        isStripeSubscriptionCancelScheduled({
          status: 'active',
          cancelAtPeriodEnd: false,
        }),
      ).toBe(false);
    });
  });

  describe('memberHasStripeCancelScheduled', () => {
    it('returns true when any linked plan is scheduled to cancel', () => {
      expect(
        memberHasStripeCancelScheduled([
          { cancelAtPeriodEnd: false },
          { cancelAtPeriodEnd: true },
        ]),
      ).toBe(true);
    });
  });

  describe('shouldRevokeStripeTelegramMemberLinkForSubscription', () => {
    it('revokes canceled subscriptions', () => {
      expect(
        shouldRevokeStripeTelegramMemberLinkForSubscription({
          status: 'canceled',
        }),
      ).toBe(true);
    });

    it('keeps active subscriptions even when cancel is scheduled', () => {
      expect(
        shouldRevokeStripeTelegramMemberLinkForSubscription({
          status: 'active',
          cancelAtPeriodEnd: true,
        }),
      ).toBe(false);
    });

    it('keeps active subscriptions without scheduled cancel', () => {
      expect(
        shouldRevokeStripeTelegramMemberLinkForSubscription({
          status: 'active',
          cancelAtPeriodEnd: false,
        }),
      ).toBe(false);
    });
  });

  describe('resolveStripePayerSubscriptionForLink', () => {
    it('hides canceled subscription linked to the member', () => {
      expect(
        resolveStripePayerSubscriptionForLink(
          {
            connectionId: 'conn_1',
            stripeCustomerId: 'cus_1',
            stripeSubscriptionId: 'sub_old',
          },
          [
            {
              connectionId: 'conn_1',
              stripeCustomerId: 'cus_1',
              stripeSubscriptionId: 'sub_old',
              status: 'canceled',
            },
          ],
        ),
      ).toBeNull();
    });

    it('shows a newer active subscription after re-subscribe', () => {
      expect(
        resolveStripePayerSubscriptionForLink(
          {
            connectionId: 'conn_1',
            stripeCustomerId: 'cus_1',
            stripeSubscriptionId: 'sub_old',
          },
          [
            {
              connectionId: 'conn_1',
              stripeCustomerId: 'cus_1',
              stripeSubscriptionId: 'sub_old',
              status: 'canceled',
            },
            {
              connectionId: 'conn_1',
              stripeCustomerId: 'cus_1',
              stripeSubscriptionId: 'sub_new',
              status: 'active',
            },
          ],
        ),
      ).toEqual({
        connectionId: 'conn_1',
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_new',
        status: 'active',
      });
    });
  });

  describe('isManageableStripeSubscriptionForCancel', () => {
    it('allows active and trialing subscriptions', () => {
      expect(
        isManageableStripeSubscriptionForCancel({ status: 'active' }),
      ).toBe(true);
      expect(
        isManageableStripeSubscriptionForCancel({ status: 'trialing' }),
      ).toBe(true);
    });

    it('allows past_due subscriptions', () => {
      expect(
        isManageableStripeSubscriptionForCancel({ status: 'past_due' }),
      ).toBe(true);
    });

    it('rejects canceled subscriptions', () => {
      expect(
        isManageableStripeSubscriptionForCancel({ status: 'canceled' }),
      ).toBe(false);
    });

    it('allows unknown subscription rows while sync catches up', () => {
      expect(isManageableStripeSubscriptionForCancel(null)).toBe(true);
      expect(isManageableStripeSubscriptionForCancel(undefined)).toBe(true);
    });
  });

  describe('canOpenStripeSubscriptionCancelPortal', () => {
    it('allows portal when subscription sync has not run yet', () => {
      expect(canOpenStripeSubscriptionCancelPortal([])).toBe(true);
    });

    it('allows portal when customer has a new active subscription after cancel', () => {
      expect(
        canOpenStripeSubscriptionCancelPortal([
          { status: 'canceled' },
          { status: 'active' },
        ]),
      ).toBe(true);
    });

    it('blocks portal when every synced subscription is ended', () => {
      expect(
        canOpenStripeSubscriptionCancelPortal([{ status: 'canceled' }]),
      ).toBe(false);
    });

    it('allows portal when active link points to a subscription not synced yet', () => {
      expect(
        canOpenStripeSubscriptionCancelPortal(
          [
            {
              stripeSubscriptionId: 'sub_old',
              status: 'canceled',
            },
          ],
          {
            status: 'ACTIVE',
            stripeSubscriptionId: 'sub_new',
          },
        ),
      ).toBe(true);
    });
  });

  describe('pickStripeSubscriptionForCancel', () => {
    it('prefers the subscription linked after checkout', () => {
      expect(
        pickStripeSubscriptionForCancel(
          [
            {
              stripeSubscriptionId: 'sub_old',
              status: 'canceled',
              planName: 'Plano antigo',
            },
            {
              stripeSubscriptionId: 'sub_new',
              status: 'active',
              planName: 'Plano novo',
            },
          ],
          'sub_new',
        ),
      ).toEqual({
        stripeSubscriptionId: 'sub_new',
        status: 'active',
        planName: 'Plano novo',
      });
    });

    it('returns undefined when only ended subscriptions exist', () => {
      expect(
        pickStripeSubscriptionForCancel([{ status: 'canceled' }], 'sub_old'),
      ).toBeUndefined();
    });
  });
});

describe('resolveStripeLinkedTelegramSubscriber', () => {
  it('returns null when no stripe ids are provided', async () => {
    const prisma = {} as never;
    await expect(
      resolveStripeLinkedTelegramSubscriber(prisma, {
        connectionId: 'conn-1',
      }),
    ).resolves.toBeNull();
  });
});

describeWithDb('resolveStripeLinkedTelegramSubscriber (database)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('resolves subscriber by stripe subscription id', async () => {
    const link = await prisma.stripeTelegramMemberLinks.findFirst({
      where: { status: StripeTelegramMemberLinkStatus.ACTIVE },
      select: {
        connectionId: true,
        telegramUserId: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!link?.stripeSubscriptionId) {
      console.warn(
        'Nenhum vínculo Stripe↔Telegram ativo — pulando teste de banco.',
      );
      return;
    }

    const subscriber = await resolveStripeLinkedTelegramSubscriber(prisma, {
      connectionId: link.connectionId,
      stripeSubscriptionId: link.stripeSubscriptionId,
    });

    expect(subscriber?.telegramUserId).toBe(link.telegramUserId);
  });
});

describe('StripeBillingService', () => {
  describe('listConnectionOptions', () => {
    const findMany = jest.fn();
    const paymentCount = jest.fn();

    function createService() {
      return new StripeBillingService(
        {
          stripeBillingConnections: { findMany },
          stripeBillingPayments: { count: paymentCount },
        } as never,
        {} as never,
        {
          get: jest.fn((key: string) =>
            key === 'API_PUBLIC_BASE_URL' ? 'https://api.test' : undefined,
          ),
        } as never,
        {} as never,
        {} as never,
      );
    }

    beforeEach(() => {
      findMany.mockReset();
      paymentCount.mockReset();
    });

    it('returns connected Stripe options without payment count queries', async () => {
      findMany.mockResolvedValue([
        {
          id: 'conn-1',
          stripeAccountId: 'acct_1',
          apiKeyLast4: '1234',
          encryptedWebhookSigningSecret: null,
          status: 'CONNECTED',
          lastSyncedAt: null,
          consentAcceptedAt: new Date('2026-06-21T12:00:00.000Z'),
          disconnectedAt: null,
          activeSubscriptionCount: 4,
          expiringSubscriptionCount: 1,
          expiredSubscriptionCount: 0,
          customerCount: 5,
          monthlyRevenueCents: 12_000,
          monitoredStripePriceId: 'price_123',
          monitoredStripeProductId: 'prod_123',
          monitoredPlanLabel: 'Plano VIP',
          telegramGroupId: 'group-1',
          updatedAt: new Date('2026-06-22T12:00:00.000Z'),
          group: { id: 'group-1', title: 'Grupo VIP' },
        },
      ]);

      const result = await createService().listConnectionOptions('user-1');

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', status: 'CONNECTED' },
          orderBy: { createdAt: 'asc' },
        }),
      );
      expect(paymentCount).not.toHaveBeenCalled();
      expect(result.connections).toEqual([
        expect.objectContaining({
          id: 'conn-1',
          receivedPaymentCount: 0,
          failedPaymentCount: 0,
          webhookEndpointUrl: 'https://api.test/stripe-billing/webhooks/conn-1',
          linkedGroup: { id: 'group-1', title: 'Grupo VIP' },
        }),
      ]);
    });
  });

  describe('syncAllProducts', () => {
    const findMany = jest.fn();
    const refreshConnectionProductMetadata = jest.fn();

    function createService() {
      const service = new StripeBillingService(
        {
          stripeBillingConnections: { findMany },
        } as never,
        {
          refreshConnectionProductMetadata,
        } as never,
        { get: jest.fn() } as never,
        {} as never,
        {} as never,
      );

      jest.spyOn(service, 'getStatus').mockResolvedValue({
        connected: true,
        canConnect: false,
        connections: [],
        totals: {
          activeSubscriptionCount: 0,
          expiringSubscriptionCount: 0,
          expiredSubscriptionCount: 0,
          customerCount: 0,
          monthlyRevenueCents: 0,
          receivedPaymentCount: 0,
          failedPaymentCount: 0,
        },
        stripePaymentGroupLimit: {
          planId: 'free',
          planLabel: 'Free',
          maxDistinctGroups: 1,
          usedDistinctGroups: 0,
        },
      });

      return service;
    }

    beforeEach(() => {
      findMany.mockReset();
      refreshConnectionProductMetadata.mockReset();
    });

    it('refreshes product metadata for all connected integrations', async () => {
      findMany.mockResolvedValue([{ id: 'conn-1' }, { id: 'conn-2' }]);
      refreshConnectionProductMetadata
        .mockResolvedValueOnce('refreshed')
        .mockResolvedValueOnce('skipped');

      const result = await createService().syncAllProducts('user-1');

      expect(refreshConnectionProductMetadata).toHaveBeenNthCalledWith(
        1,
        'user-1',
        'conn-1',
      );
      expect(refreshConnectionProductMetadata).toHaveBeenNthCalledWith(
        2,
        'user-1',
        'conn-2',
      );
      expect(result.productsSync).toEqual({
        refreshedCount: 1,
        skippedCount: 1,
        failedCount: 0,
      });
      expect(result.connected).toBe(true);
    });
  });
});

describeWithDb('Stripe automation alerts (database)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('has active Stripe automations for Zeus Plano Básico when configured', async () => {
    const connections = await prisma.stripeBillingConnections.findMany({
      where: {
        monitoredPlanLabel: {
          contains: 'Plano Básico',
          mode: 'insensitive',
        },
      },
      select: { id: true, userId: true, monitoredPlanLabel: true },
    });

    if (connections.length === 0) {
      console.warn(
        'Nenhuma conexão Stripe com "Plano Básico" encontrada — configure a integração para validar no banco.',
      );
      return;
    }

    const stripeTriggers = [
      'STRIPE_PAYMENT_SUCCEEDED',
      'STRIPE_PAYMENT_FAILED',
      'STRIPE_SUBSCRIPTION_EXPIRING',
      'STRIPE_SUBSCRIPTION_EXPIRED',
      'STRIPE_SUBSCRIPTION_RENEWED',
      'STRIPE_SUBSCRIPTION_CANCELED',
    ] as const;

    for (const connection of connections) {
      const alerts = await prisma.telegramAlerts.findMany({
        where: {
          userId: connection.userId,
          status: AlertStatus.ACTIVE,
          destinationType: AlertDestinationType.AUTOMATION,
          triggerType: { in: [...stripeTriggers] },
        },
        select: {
          id: true,
          name: true,
          triggerType: true,
          triggerConfig: true,
        },
      });

      const boundToConnection = alerts.filter((alert) => {
        const config = (alert.triggerConfig ?? {}) as {
          stripeConnectionId?: string;
        };
        return (
          !config.stripeConnectionId ||
          config.stripeConnectionId === connection.id
        );
      });

      expect(boundToConnection.length).toBeGreaterThan(0);

      for (const alert of boundToConnection) {
        expect(alert.triggerType).toMatch(/^STRIPE_/);
        const config = alert.triggerConfig as {
          targetTelegramGroupIds?: string[];
        };
        expect(config.targetTelegramGroupIds?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });
});

const FIXED_NOW = new Date('2026-06-21T12:00:00.000Z').getTime();
const DAY_MS = 86_400_000;

function daysFromNow(days: number) {
  return new Date(FIXED_NOW + days * DAY_MS);
}

describeWithDb('Stripe alert triggers (integration)', () => {
  jest.setTimeout(60_000);

  let prisma: PrismaService;
  let alertsService: AlertsService;
  let fixture: StripeIntegrationFixture;
  let dispatchDeps: StripeAutomationDispatchDeps;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: TelegramService,
          useValue: {
            sendAlertToChat: jest.fn().mockResolvedValue({ ok: true }),
            sendAlertDm: jest.fn().mockResolvedValue({ ok: true }),
          },
        },
      ],
    }).compile();

    alertsService = module.get(AlertsService);

    const loaded = await loadStripeIntegrationFixture(prisma);
    if (!loaded) {
      throw new Error(
        'Fixture Stripe não encontrada: conecte o Plano Básico e um grupo com bot administrador.',
      );
    }
    fixture = loaded;

    dispatchDeps = {
      alerts: alertsService,
      prisma,
      recordAudit: async (
        userId,
        connectionId,
        action: StripeBillingAuditAction,
        metadata,
      ) => {
        await prisma.stripeBillingAuditLogs.create({
          data: { userId, connectionId, action, metadata },
        });
      },
    };
  });

  afterAll(async () => {
    await cleanupStripeIntegrationAlerts(prisma);
    await prisma.$disconnect();
  });

  it('creates one active automation alert per Stripe trigger type', () => {
    for (const triggerType of ALL_STRIPE_ALERT_TRIGGERS) {
      expect(fixture.alertIdsByTrigger[triggerType]).toBeTruthy();
    }
    expect(Object.keys(fixture.alertIdsByTrigger)).toHaveLength(6);
  });

  async function expectTriggerDispatched(
    triggerType: AlertTriggerType,
    provoke: () => Promise<AlertTriggerType | null>,
  ) {
    const alertId = fixture.alertIdsByTrigger[triggerType];
    const runsBefore = await countAlertRuns(prisma, alertId);

    const resolved = await provoke();
    expect(resolved).toBe(triggerType);

    const runsAfter = await countAlertRuns(prisma, alertId);
    expect(runsAfter).toBeGreaterThan(runsBefore);

    const latestRun = await prisma.telegramAlertRuns.findFirst({
      where: { alertId },
      orderBy: { createdAt: 'desc' },
      include: {
        deliveries: {
          select: { status: true, telegramUserId: true, chatId: true },
        },
      },
    });
    expect(latestRun?.successCount).toBeGreaterThan(0);

    if (fixture.linkedTelegramUserId) {
      expect(latestRun?.deliveries[0]?.telegramUserId).toBe(
        fixture.linkedTelegramUserId,
      );
      expect(latestRun?.deliveries[0]?.chatId).toBeNull();
    }

    const audit = await prisma.stripeBillingAuditLogs.findFirst({
      where: {
        userId: fixture.userId,
        action: 'AUTOMATION_TRIGGERED',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit?.metadata).toEqual(
      expect.objectContaining({
        triggerType,
        triggeredCount: expect.any(Number),
        deliveryChannel: fixture.linkedTelegramUserId
          ? 'telegram_dm'
          : 'telegram_group',
      }),
    );
  }

  it('dispatches STRIPE_PAYMENT_SUCCEEDED when invoice is paid', async () => {
    await expectTriggerDispatched(
      AlertTriggerType.STRIPE_PAYMENT_SUCCEEDED,
      () =>
        processInvoiceStripeEvent(
          dispatchDeps,
          fixture.userId,
          fixture.connectionId,
          'paid',
          `inv_test_paid_${Date.now()}`,
          fixture.testStripeCustomerId,
        ),
    );
  });

  it('dispatches STRIPE_PAYMENT_FAILED when invoice is void', async () => {
    await expectTriggerDispatched(AlertTriggerType.STRIPE_PAYMENT_FAILED, () =>
      processInvoiceStripeEvent(
        dispatchDeps,
        fixture.userId,
        fixture.connectionId,
        'void',
        `inv_test_void_${Date.now()}`,
        fixture.testStripeCustomerId,
      ),
    );
  });

  it('dispatches STRIPE_SUBSCRIPTION_EXPIRING when period ends within 7 days', async () => {
    await expectTriggerDispatched(
      AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING,
      () =>
        processSubscriptionStripeEvent(dispatchDeps, {
          userId: fixture.userId,
          connectionId: fixture.connectionId,
          existing: {
            status: 'active',
            currentPeriodEnd: daysFromNow(30),
          },
          status: 'active',
          currentPeriodEnd: daysFromNow(3),
          stripeSubscriptionId: fixture.testStripeSubscriptionId,
          stripeCustomerId: fixture.testStripeCustomerId,
          nowMs: FIXED_NOW,
        }),
    );
  });

  it('dispatches STRIPE_SUBSCRIPTION_EXPIRED when status becomes unpaid', async () => {
    await expectTriggerDispatched(
      AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED,
      () =>
        processSubscriptionStripeEvent(dispatchDeps, {
          userId: fixture.userId,
          connectionId: fixture.connectionId,
          existing: {
            status: 'active',
            currentPeriodEnd: daysFromNow(5),
          },
          status: 'unpaid',
          currentPeriodEnd: daysFromNow(5),
          stripeSubscriptionId: fixture.testStripeSubscriptionId,
          stripeCustomerId: fixture.testStripeCustomerId,
          nowMs: FIXED_NOW,
        }),
    );
  });

  it('dispatches STRIPE_SUBSCRIPTION_RENEWED when period end advances', async () => {
    await expectTriggerDispatched(
      AlertTriggerType.STRIPE_SUBSCRIPTION_RENEWED,
      () =>
        processSubscriptionStripeEvent(dispatchDeps, {
          userId: fixture.userId,
          connectionId: fixture.connectionId,
          existing: {
            status: 'active',
            currentPeriodEnd: daysFromNow(5),
          },
          status: 'active',
          currentPeriodEnd: daysFromNow(35),
          stripeSubscriptionId: fixture.testStripeSubscriptionId,
          stripeCustomerId: fixture.testStripeCustomerId,
          nowMs: FIXED_NOW,
        }),
    );
  });

  it('dispatches STRIPE_SUBSCRIPTION_CANCELED when status becomes canceled', async () => {
    await expectTriggerDispatched(
      AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED,
      () =>
        processSubscriptionStripeEvent(dispatchDeps, {
          userId: fixture.userId,
          connectionId: fixture.connectionId,
          existing: {
            status: 'active',
            currentPeriodEnd: daysFromNow(10),
          },
          status: 'canceled',
          currentPeriodEnd: daysFromNow(10),
          stripeSubscriptionId: fixture.testStripeSubscriptionId,
          stripeCustomerId: fixture.testStripeCustomerId,
          nowMs: FIXED_NOW,
        }),
    );
  });
});

import { resolve } from 'node:path';
import { Test, type TestingModule } from '@nestjs/testing';
import { config as loadDotenv } from 'dotenv';
import {
  AlertTriggerType,
  type StripeBillingAuditAction,
} from '@prisma/client';
import {
  processInvoiceStripeEvent,
  processSubscriptionStripeEvent,
  type StripeAutomationDispatchDeps,
} from '../../lib/stripe-billing-alert-dispatch';
import { AlertsService } from '../alerts/alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
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
    await expectTriggerDispatched(
      AlertTriggerType.STRIPE_PAYMENT_FAILED,
      () =>
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

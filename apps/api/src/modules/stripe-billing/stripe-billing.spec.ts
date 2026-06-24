/**
 * Stripe billing module tests (integration checks skipped without DATABASE_URL).
 */
import { resolve } from 'node:path';
import { Test, type TestingModule } from '@nestjs/testing';
import { config as loadDotenv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  AlertDestinationType,
  AlertStatus,
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
  const adapter = new PrismaPg({ connectionString: databaseUrl! });
  return new PrismaClient({ adapter });
}

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

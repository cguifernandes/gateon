import { Test, type TestingModule } from '@nestjs/testing';
import { AlertDestinationType, AlertStatus } from '@prisma/client';
import {
  alertUpsertSchema,
} from '../../lib/zod/alert-schemas';
import {
  filterStripeAutomationAlerts,
  isStripeAutomationTriggerType,
} from '../../lib/stripe/automation-alerts';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

const stripeTriggers = [
  'STRIPE_PAYMENT_SUCCEEDED',
  'STRIPE_PAYMENT_FAILED',
  'STRIPE_SUBSCRIPTION_EXPIRING',
  'STRIPE_SUBSCRIPTION_EXPIRED',
  'STRIPE_SUBSCRIPTION_RENEWED',
  'STRIPE_SUBSCRIPTION_CANCELED',
] as const;

const baseStripeAutomation = {
  name: 'Zeus pagamento',
  destinationType: 'AUTOMATION' as const,
  content: { body: 'Mensagem automática Stripe' },
  triggerConfig: {
    targetTelegramGroupIds: ['group-zeus'],
    stripeConnectionId: 'conn-zeus-basico',
  },
};

describe('filterStripeAutomationAlerts', () => {
  const alerts = [
    { id: 'a1', triggerConfig: { stripeConnectionId: 'conn-zeus' } },
    { id: 'a2', triggerConfig: { stripeConnectionId: 'conn-other' } },
    { id: 'a3', triggerConfig: {} },
    { id: 'a4', triggerConfig: null },
  ];

  it('matches alerts bound to the same Stripe connection and legacy alerts', () => {
    const matched = filterStripeAutomationAlerts(alerts, 'conn-zeus');
    expect(matched.map((alert) => alert.id).sort()).toEqual(['a1', 'a3', 'a4']);
  });

  it('excludes alerts bound to a different connection', () => {
    const matched = filterStripeAutomationAlerts(alerts, 'conn-zeus');
    expect(matched.map((alert) => alert.id)).not.toContain('a2');
  });
});

describe('isStripeAutomationTriggerType', () => {
  it.each(stripeTriggers)('recognizes %s as Stripe automation', (trigger) => {
    expect(isStripeAutomationTriggerType(trigger)).toBe(true);
  });

  it('rejects Telegram member triggers', () => {
    expect(isStripeAutomationTriggerType('MEMBER_JOINED')).toBe(false);
    expect(isStripeAutomationTriggerType(null)).toBe(false);
  });
});

describe('alertUpsertSchema — Stripe automations', () => {
  it.each(stripeTriggers)(
    'accepts valid AUTOMATION alert for %s',
    (triggerType) => {
      const result = alertUpsertSchema.safeParse({
        ...baseStripeAutomation,
        triggerType,
      });
      expect(result.success).toBe(true);
    },
  );

  it('rejects Stripe automation without stripeConnectionId', () => {
    const result = alertUpsertSchema.safeParse({
      ...baseStripeAutomation,
      triggerType: 'STRIPE_PAYMENT_SUCCEEDED',
      triggerConfig: { targetTelegramGroupIds: ['group-zeus'] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toContain('triggerConfig.stripeConnectionId');
    }
  });

  it('rejects Stripe automation without monitored groups', () => {
    const result = alertUpsertSchema.safeParse({
      ...baseStripeAutomation,
      triggerType: 'STRIPE_SUBSCRIPTION_EXPIRING',
      triggerConfig: { stripeConnectionId: 'conn-zeus-basico' },
    });
    expect(result.success).toBe(false);
  });
});

describe('AlertsService.triggerAutomationAlertsForUser', () => {
  let service: AlertsService;
  const runAlert = jest.fn().mockResolvedValue(undefined);
  const findMany = jest.fn();

  beforeEach(async () => {
    runAlert.mockClear();
    findMany.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: PrismaService,
          useValue: {
            telegramAlerts: { findMany },
          },
        },
        {
          provide: TelegramService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(AlertsService);
    jest.spyOn(service, 'runAlert').mockImplementation(runAlert);
  });

  it('runs only Stripe automations matching the connection id', async () => {
    findMany.mockResolvedValue([
      {
        id: 'payment-success',
        triggerConfig: { stripeConnectionId: 'conn-zeus' },
      },
      {
        id: 'payment-failed-other',
        triggerConfig: { stripeConnectionId: 'conn-other' },
      },
      {
        id: 'legacy-any-connection',
        triggerConfig: {},
      },
    ]);

    const result = await service.triggerAutomationAlertsForUser(
      'user-1',
      'STRIPE_PAYMENT_SUCCEEDED',
      'conn-zeus',
    );

    expect(result.triggeredCount).toBe(2);
    expect(runAlert).toHaveBeenCalledTimes(2);
    expect(runAlert).toHaveBeenCalledWith('payment-success', {
      throwOnTotalFailure: false,
    });
    expect(runAlert).toHaveBeenCalledWith('legacy-any-connection', {
      throwOnTotalFailure: false,
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: AlertStatus.ACTIVE,
        destinationType: AlertDestinationType.AUTOMATION,
        triggerType: 'STRIPE_PAYMENT_SUCCEEDED',
      },
      select: { id: true, triggerConfig: true },
      take: 100,
    });
  });

  it('delivers linked Stripe automations to the subscriber private chat', async () => {
    findMany.mockResolvedValue([
      {
        id: 'payment-success',
        triggerConfig: { stripeConnectionId: 'conn-zeus' },
      },
    ]);

    await service.triggerAutomationAlertsForUser(
      'user-1',
      'STRIPE_PAYMENT_SUCCEEDED',
      'conn-zeus',
      { telegramUserId: 'tg-42', displayName: 'Zeus' },
    );

    expect(runAlert).toHaveBeenCalledWith('payment-success', {
      throwOnTotalFailure: false,
      scopeToTelegramUserId: 'tg-42',
      scopeToMemberDisplayName: 'Zeus',
    });
  });
});

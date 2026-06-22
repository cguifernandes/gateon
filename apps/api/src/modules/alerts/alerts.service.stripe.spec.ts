import { Test, type TestingModule } from '@nestjs/testing';
import { AlertDestinationType, AlertStatus } from '@prisma/client';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

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

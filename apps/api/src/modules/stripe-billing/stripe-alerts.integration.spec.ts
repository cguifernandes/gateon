/**
 * Integration checks against the local database.
 * Skipped when DATABASE_URL is not set.
 */
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  AlertDestinationType,
  AlertStatus,
} from '@prisma/client';

loadDotenv({ path: resolve(__dirname, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL?.trim();
const describeWithDb = databaseUrl ? describe : describe.skip;

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: databaseUrl! });
  return new PrismaClient({ adapter });
}

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

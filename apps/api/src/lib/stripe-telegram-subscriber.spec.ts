import { resolve } from 'node:path';
import { StripeTelegramMemberLinkStatus } from '@prisma/client';
import { config as loadDotenv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { resolveStripeLinkedTelegramSubscriber } from './stripe-telegram-subscriber';

loadDotenv({ path: resolve(__dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL?.trim();
const describeWithDb = databaseUrl ? describe : describe.skip;

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: databaseUrl! });
  return new PrismaClient({ adapter });
}

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

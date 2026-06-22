import {
  AlertDestinationType,
  AlertStatus,
  AlertTriggerType,
  StripeTelegramMemberLinkStatus,
  type PrismaClient,
} from '@prisma/client';

export const STRIPE_INTEGRATION_ALERT_PREFIX = '[integration-test-stripe]';
export const STRIPE_INTEGRATION_TEST_CUSTOMER_ID =
  'cus_gateon_integration_test';
export const STRIPE_INTEGRATION_TEST_SUBSCRIPTION_ID =
  'sub_gateon_integration_test';

export const ALL_STRIPE_ALERT_TRIGGERS = [
  AlertTriggerType.STRIPE_PAYMENT_SUCCEEDED,
  AlertTriggerType.STRIPE_PAYMENT_FAILED,
  AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING,
  AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED,
  AlertTriggerType.STRIPE_SUBSCRIPTION_RENEWED,
  AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED,
] as const;

export type StripeIntegrationFixture = {
  userId: string;
  connectionId: string;
  groupId: string;
  linkedTelegramUserId: string | null;
  testStripeCustomerId: string;
  testStripeSubscriptionId: string;
  alertIdsByTrigger: Record<
    (typeof ALL_STRIPE_ALERT_TRIGGERS)[number],
    string
  >;
};

const defaultAlertContent = {
  title: 'Teste integração Stripe',
  body: 'Mensagem automática de teste — pode ignorar.',
};

const defaultAlertOptions = {
  silent: true,
  pinMessage: false,
  mentionUsers: false,
  respectLocalTime: true,
  autoPauseOnFailure: true,
};

export async function loadStripeIntegrationFixture(
  prisma: PrismaClient,
): Promise<StripeIntegrationFixture | null> {
  const connection = await prisma.stripeBillingConnections.findFirst({
    where: {
      monitoredPlanLabel: { contains: 'Plano Básico', mode: 'insensitive' },
      status: 'CONNECTED',
    },
    select: {
      id: true,
      userId: true,
      telegramGroupId: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!connection) {
    return null;
  }

  let groupId = connection.telegramGroupId;

  if (groupId) {
    const group = await prisma.telegramGroups.findUnique({
      where: { id: groupId },
      select: { id: true, botStatus: true },
    });
    if (!group || group.botStatus !== 'administrator') {
      groupId = null;
    }
  }

  if (!groupId) {
    const fallbackGroup = await prisma.telegramGroups.findFirst({
      where: {
        userId: connection.userId,
        botStatus: 'administrator',
      },
      select: { id: true },
      orderBy: { connectedAt: 'desc' },
    });
    if (!fallbackGroup) {
      return null;
    }
    groupId = fallbackGroup.id;
  }

  const memberLink = await ensureIntegrationMemberLink(prisma, {
    userId: connection.userId,
    connectionId: connection.id,
    groupId,
  });

  const alertIdsByTrigger = {} as StripeIntegrationFixture['alertIdsByTrigger'];

  for (const triggerType of ALL_STRIPE_ALERT_TRIGGERS) {
    const name = `${STRIPE_INTEGRATION_ALERT_PREFIX} ${triggerType}`;
    const existing = await prisma.telegramAlerts.findFirst({
      where: { userId: connection.userId, name },
      select: { id: true },
    });

    if (existing) {
      await prisma.telegramAlerts.update({
        where: { id: existing.id },
        data: {
          status: AlertStatus.ACTIVE,
          destinationType: AlertDestinationType.AUTOMATION,
          triggerType,
          telegramGroupId: groupId,
          triggerConfig: {
            stripeConnectionId: connection.id,
            targetTelegramGroupIds: [groupId],
          },
          content: defaultAlertContent,
          options: defaultAlertOptions,
        },
      });
      alertIdsByTrigger[triggerType] = existing.id;
      continue;
    }

    const created = await prisma.telegramAlerts.create({
      data: {
        userId: connection.userId,
        createdByUserId: connection.userId,
        name,
        status: AlertStatus.ACTIVE,
        destinationType: AlertDestinationType.AUTOMATION,
        triggerType,
        telegramGroupId: groupId,
        content: defaultAlertContent,
        options: defaultAlertOptions,
        triggerConfig: {
          stripeConnectionId: connection.id,
          targetTelegramGroupIds: [groupId],
        },
      },
      select: { id: true },
    });
    alertIdsByTrigger[triggerType] = created.id;
  }

  return {
    userId: connection.userId,
    connectionId: connection.id,
    groupId,
    linkedTelegramUserId: memberLink?.telegramUserId ?? null,
    testStripeCustomerId:
      memberLink?.stripeCustomerId ?? STRIPE_INTEGRATION_TEST_CUSTOMER_ID,
    testStripeSubscriptionId:
      memberLink?.stripeSubscriptionId ?? STRIPE_INTEGRATION_TEST_SUBSCRIPTION_ID,
    alertIdsByTrigger,
  };
}

type IntegrationMemberLink = {
  telegramUserId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
};

async function ensureIntegrationMemberLink(
  prisma: PrismaClient,
  params: { userId: string; connectionId: string; groupId: string },
): Promise<IntegrationMemberLink | null> {
  const existingLink = await prisma.stripeTelegramMemberLinks.findFirst({
    where: {
      connectionId: params.connectionId,
      status: StripeTelegramMemberLinkStatus.ACTIVE,
    },
    select: {
      telegramUserId: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  if (existingLink) {
    return {
      telegramUserId: existingLink.telegramUserId,
      stripeCustomerId: existingLink.stripeCustomerId,
      stripeSubscriptionId:
        existingLink.stripeSubscriptionId ??
        STRIPE_INTEGRATION_TEST_SUBSCRIPTION_ID,
    };
  }

  const member = await prisma.telegramGroupMembers.findFirst({
    where: {
      telegramGroupId: params.groupId,
      leftAt: null,
    },
    select: { telegramUserId: true },
    orderBy: { joinedAt: 'desc' },
  });
  if (!member) {
    return null;
  }

  await prisma.stripeTelegramMemberLinks.upsert({
    where: {
      connectionId_telegramUserId: {
        connectionId: params.connectionId,
        telegramUserId: member.telegramUserId,
      },
    },
    create: {
      userId: params.userId,
      connectionId: params.connectionId,
      telegramGroupId: params.groupId,
      telegramUserId: member.telegramUserId,
      stripeCustomerId: STRIPE_INTEGRATION_TEST_CUSTOMER_ID,
      stripeSubscriptionId: STRIPE_INTEGRATION_TEST_SUBSCRIPTION_ID,
      status: StripeTelegramMemberLinkStatus.ACTIVE,
    },
    update: {
      telegramGroupId: params.groupId,
      stripeCustomerId: STRIPE_INTEGRATION_TEST_CUSTOMER_ID,
      stripeSubscriptionId: STRIPE_INTEGRATION_TEST_SUBSCRIPTION_ID,
      status: StripeTelegramMemberLinkStatus.ACTIVE,
    },
  });

  return {
    telegramUserId: member.telegramUserId,
    stripeCustomerId: STRIPE_INTEGRATION_TEST_CUSTOMER_ID,
    stripeSubscriptionId: STRIPE_INTEGRATION_TEST_SUBSCRIPTION_ID,
  };
}

export async function cleanupStripeIntegrationAlerts(prisma: PrismaClient) {
  await prisma.telegramAlerts.deleteMany({
    where: {
      name: { startsWith: STRIPE_INTEGRATION_ALERT_PREFIX },
    },
  });
}

export async function countAlertRuns(prisma: PrismaClient, alertId: string) {
  return prisma.telegramAlertRuns.count({ where: { alertId } });
}

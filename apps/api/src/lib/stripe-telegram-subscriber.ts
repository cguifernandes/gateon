import { StripeTelegramMemberLinkStatus, type Prisma } from '@prisma/client';
import type { PrismaService } from '../modules/prisma/prisma.service';

export type StripeLinkedTelegramSubscriber = {
  telegramUserId: string;
  telegramGroupId: string;
  displayName?: string;
};

type StripeTelegramSubscriberPrisma = Pick<
  PrismaService,
  'stripeTelegramMemberLinks' | 'telegramGroupMembers'
>;

type ResolveStripeLinkedTelegramSubscriberOptions = {
  includeRevokedLinks?: boolean;
};

export async function resolveStripeLinkedTelegramSubscriber(
  prisma: StripeTelegramSubscriberPrisma,
  params: {
    connectionId: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  },
  options?: ResolveStripeLinkedTelegramSubscriberOptions,
): Promise<StripeLinkedTelegramSubscriber | null> {
  const { connectionId, stripeCustomerId, stripeSubscriptionId } = params;
  if (!stripeCustomerId && !stripeSubscriptionId) {
    return null;
  }

  const linkStatuses = options?.includeRevokedLinks
    ? [
        StripeTelegramMemberLinkStatus.ACTIVE,
        StripeTelegramMemberLinkStatus.REVOKED,
      ]
    : [StripeTelegramMemberLinkStatus.ACTIVE];

  const baseWhere: Prisma.StripeTelegramMemberLinksWhereInput = {
    connectionId,
    status: { in: linkStatuses },
  };

  let link: {
    telegramUserId: string;
    telegramGroupId: string;
  } | null = null;

  if (stripeSubscriptionId) {
    link = await prisma.stripeTelegramMemberLinks.findFirst({
      where: {
        ...baseWhere,
        stripeSubscriptionId,
      },
      select: { telegramUserId: true, telegramGroupId: true },
    });
  }

  if (!link && stripeCustomerId) {
    if (linkStatuses.includes(StripeTelegramMemberLinkStatus.ACTIVE)) {
      link = await prisma.stripeTelegramMemberLinks.findFirst({
        where: {
          ...baseWhere,
          status: StripeTelegramMemberLinkStatus.ACTIVE,
          stripeCustomerId,
        },
        select: { telegramUserId: true, telegramGroupId: true },
      });
    }

    if (!link) {
      link = await prisma.stripeTelegramMemberLinks.findFirst({
        where: {
          ...baseWhere,
          stripeCustomerId,
        },
        select: { telegramUserId: true, telegramGroupId: true },
      });
    }
  }

  if (!link) {
    return null;
  }

  const member = await prisma.telegramGroupMembers.findFirst({
    where: {
      telegramGroupId: link.telegramGroupId,
      telegramUserId: link.telegramUserId,
      leftAt: null,
    },
    select: { firstName: true, lastName: true },
  });

  const displayName = [member?.firstName, member?.lastName]
    .filter((part) => part && part.trim().length > 0)
    .join(' ')
    .trim();

  return {
    telegramUserId: link.telegramUserId,
    telegramGroupId: link.telegramGroupId,
    ...(displayName ? { displayName } : {}),
  };
}

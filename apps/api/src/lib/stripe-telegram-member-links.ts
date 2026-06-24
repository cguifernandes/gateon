import {
  StripeTelegramMemberLinkStatus,
  type Prisma,
} from '@prisma/client';
import type { PrismaService } from '../modules/prisma/prisma.service';

export const ENTITLED_STRIPE_SUBSCRIPTION_STATUSES = new Set([
  'active',
  'trialing',
]);

export type StripeSubscriptionEntitlementSnapshot = {
  status: string;
  cancelAtPeriodEnd?: boolean;
};

export function isEntitledStripeSubscription(
  subscription: StripeSubscriptionEntitlementSnapshot | null | undefined,
): boolean {
  if (!subscription) {
    return false;
  }

  return ENTITLED_STRIPE_SUBSCRIPTION_STATUSES.has(subscription.status);
}

export function shouldRevokeStripeTelegramMemberLink(
  subscriptionStatus: string,
): boolean {
  return !ENTITLED_STRIPE_SUBSCRIPTION_STATUSES.has(subscriptionStatus);
}

type RevokeStripeTelegramMemberLinksParams = {
  connectionId: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
};

export async function revokeStripeTelegramMemberLinks(
  prisma: Pick<PrismaService, 'stripeTelegramMemberLinks'>,
  params: RevokeStripeTelegramMemberLinksParams,
): Promise<number> {
  const { connectionId, stripeSubscriptionId, stripeCustomerId } = params;
  const matchFilters: Prisma.StripeTelegramMemberLinksWhereInput[] = [];

  if (stripeSubscriptionId) {
    matchFilters.push({ stripeSubscriptionId });
  }

  if (stripeCustomerId) {
    matchFilters.push({ stripeCustomerId });
  }

  if (matchFilters.length === 0) {
    return 0;
  }

  const result = await prisma.stripeTelegramMemberLinks.updateMany({
    where: {
      connectionId,
      status: StripeTelegramMemberLinkStatus.ACTIVE,
      OR: matchFilters,
    },
    data: {
      status: StripeTelegramMemberLinkStatus.REVOKED,
    },
  });

  return result.count;
}

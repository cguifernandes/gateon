import { StripeTelegramMemberLinkStatus, type Prisma, type PrismaClient } from '@prisma/client';

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

export function showsStripePayerBadge(
  subscription: StripeSubscriptionEntitlementSnapshot | null | undefined,
): boolean {
  return isEntitledStripeSubscription(subscription);
}

export function isStripeSubscriptionCancelScheduled(
  subscription: StripeSubscriptionEntitlementSnapshot | null | undefined,
): boolean {
  return (
    isEntitledStripeSubscription(subscription) &&
    subscription?.cancelAtPeriodEnd === true
  );
}

export function shouldRevokeStripeTelegramMemberLinkForSubscription(
  subscription: StripeSubscriptionEntitlementSnapshot,
): boolean {
  return shouldRevokeStripeTelegramMemberLink(subscription.status);
}

export type LinkedStripePlanSummary = {
  connectionId: string;
  label: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
};

export function memberHasStripeCancelScheduled(
  plans: Pick<LinkedStripePlanSummary, 'cancelAtPeriodEnd'>[],
): boolean {
  return plans.some((plan) => plan.cancelAtPeriodEnd);
}

export function memberHasStripeCanceled(
  plans: Pick<LinkedStripePlanSummary, 'canceledAt'>[],
): boolean {
  return plans.some((plan) => plan.canceledAt != null);
}

export type StripePayerSubscriptionSnapshot =
  StripeSubscriptionEntitlementSnapshot & {
    connectionId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string;
  };

export function resolveStripePayerSubscriptionForLink(
  link: {
    connectionId: string;
    stripeCustomerId: string;
    stripeSubscriptionId?: string | null;
  },
  subscriptions: StripePayerSubscriptionSnapshot[],
): StripePayerSubscriptionSnapshot | null {
  const customerSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.connectionId === link.connectionId &&
      subscription.stripeCustomerId === link.stripeCustomerId,
  );

  if (link.stripeSubscriptionId) {
    const linkedSubscription = customerSubscriptions.find(
      (subscription) =>
        subscription.stripeSubscriptionId === link.stripeSubscriptionId,
    );

    if (showsStripePayerBadge(linkedSubscription)) {
      return linkedSubscription ?? null;
    }
  }

  return (
    customerSubscriptions.find((subscription) =>
      showsStripePayerBadge(subscription),
    ) ?? null
  );
}

const MANAGEABLE_STRIPE_SUBSCRIPTION_STATUSES = new Set([
  ...ENTITLED_STRIPE_SUBSCRIPTION_STATUSES,
  'past_due',
]);

export function isManageableStripeSubscriptionForCancel(
  subscription: StripeSubscriptionEntitlementSnapshot | null | undefined,
): boolean {
  if (!subscription) {
    return true;
  }

  return MANAGEABLE_STRIPE_SUBSCRIPTION_STATUSES.has(subscription.status);
}

export type StripeSubscriptionCancelSnapshot =
  StripeSubscriptionEntitlementSnapshot & {
    stripeSubscriptionId?: string | null;
    planName?: string | null;
  };

export type StripeSubscriptionCancelLinkHint = {
  status?: string;
  stripeSubscriptionId?: string | null;
};

export function canOpenStripeSubscriptionCancelPortal(
  subscriptions: StripeSubscriptionCancelSnapshot[],
  link?: StripeSubscriptionCancelLinkHint,
): boolean {
  if (
    link?.status === 'ACTIVE' &&
    link.stripeSubscriptionId &&
    !subscriptions.some(
      (subscription) =>
        subscription.stripeSubscriptionId === link.stripeSubscriptionId,
    )
  ) {
    return true;
  }

  if (subscriptions.length === 0) {
    return true;
  }

  return subscriptions.some((subscription) =>
    isManageableStripeSubscriptionForCancel(subscription),
  );
}

export function pickStripeSubscriptionForCancel(
  subscriptions: StripeSubscriptionCancelSnapshot[],
  preferredStripeSubscriptionId?: string | null,
): StripeSubscriptionCancelSnapshot | undefined {
  const manageable = subscriptions.filter((subscription) =>
    isManageableStripeSubscriptionForCancel(subscription),
  );

  if (manageable.length === 0) {
    return undefined;
  }

  if (preferredStripeSubscriptionId) {
    const preferred = manageable.find(
      (subscription) =>
        subscription.stripeSubscriptionId === preferredStripeSubscriptionId,
    );
    if (preferred) {
      return preferred;
    }
  }

  return manageable[0];
}

type RevokeStripeTelegramMemberLinksParams = {
  connectionId: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
};

export async function revokeStripeTelegramMemberLinks(
  prisma: Pick<PrismaClient, 'stripeTelegramMemberLinks'>,
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

export async function reactivateStripeTelegramMemberLinks(
  prisma: Pick<PrismaClient, 'stripeTelegramMemberLinks'>,
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
      status: StripeTelegramMemberLinkStatus.REVOKED,
      OR: matchFilters,
    },
    data: {
      status: StripeTelegramMemberLinkStatus.ACTIVE,
      ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
    },
  });

  return result.count;
}

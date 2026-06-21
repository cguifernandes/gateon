import { getMaxGroupsForPlan } from './plan-limits';
import type { PlanId } from './zod/plan-schemas';

/** Distinct Telegram groups allowed as Stripe product targets per Gateon plan. */
export const PLAN_STRIPE_PAYMENT_GROUP_LIMITS: Record<PlanId, number> = {
  free: 1,
  starter: 5,
  pro: 100,
};

export const STRIPE_PAYMENT_GROUP_LIMIT_REACHED_CODE =
  'STRIPE_PAYMENT_GROUP_LIMIT_REACHED';

export function getMaxStripePaymentGroupsForPlan(planId: PlanId): number {
  return Math.min(
    PLAN_STRIPE_PAYMENT_GROUP_LIMITS[planId],
    getMaxGroupsForPlan(planId),
  );
}

type StripeGroupLink = {
  telegramGroupId: string | null;
};

export function countDistinctLinkedStripeGroups(
  connections: StripeGroupLink[],
): number {
  const unique = new Set<string>();
  for (const connection of connections) {
    if (connection.telegramGroupId) {
      unique.add(connection.telegramGroupId);
    }
  }
  return unique.size;
}

export function wouldExceedStripePaymentGroupLimitForLink(input: {
  connections: Array<{ id: string; telegramGroupId: string | null }>;
  connectionId?: string;
  nextGroupId: string;
  maxDistinctGroups: number;
}): boolean {
  const simulated = input.connections.map((connection) => ({
    telegramGroupId:
      input.connectionId && connection.id === input.connectionId
        ? input.nextGroupId
        : connection.telegramGroupId,
  }));

  return (
    countDistinctLinkedStripeGroups(simulated) > input.maxDistinctGroups
  );
}

export function getSelectableStripeLinkGroupIds(input: {
  connections: Array<{ id: string; telegramGroupId: string | null }>;
  connectionId?: string;
  maxDistinctGroups: number;
  allGroupIds: string[];
}): string[] {
  return input.allGroupIds.filter(
    (groupId) =>
      !wouldExceedStripePaymentGroupLimitForLink({
        connections: input.connections,
        connectionId: input.connectionId,
        nextGroupId: groupId,
        maxDistinctGroups: input.maxDistinctGroups,
      }),
  );
}

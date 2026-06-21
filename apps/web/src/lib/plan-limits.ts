import type { PlanId } from "@/lib/zod/plan-schemas";

export const DEFAULT_PLAN_ID: PlanId = "free";

export const PLAN_GROUP_LIMITS: Record<PlanId, number> = {
  free: 5,
  starter: 15,
  pro: 100,
};

export const PLAN_GROUP_MEMBER_LIMITS: Record<PlanId, number> = {
  free: 100,
  starter: 150,
  pro: 300,
};

/** Distinct Telegram groups allowed as Stripe /start payment targets per Gateon plan. */
export const PLAN_STRIPE_PAYMENT_GROUP_LIMITS: Record<PlanId, number> = {
  free: 1,
  starter: 5,
  pro: 100,
};

export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Gratuito",
  starter: "Starter",
  pro: "Pro",
};

export function getMaxGroupsForPlan(planId: PlanId): number {
  return PLAN_GROUP_LIMITS[planId];
}

export function getMaxManagedMembersPerGroupForPlan(planId: PlanId): number {
  return PLAN_GROUP_MEMBER_LIMITS[planId];
}

export function getMaxStripePaymentGroupsForPlan(planId: PlanId): number {
  return Math.min(
    PLAN_STRIPE_PAYMENT_GROUP_LIMITS[planId],
    getMaxGroupsForPlan(planId),
  );
}

export type GroupLimitSnapshot = {
  connectedCount: number;
  maxGroups: number;
  remaining: number;
  isAtLimit: boolean;
  canAddGroup: boolean;
};

export function buildGroupLimitSnapshot(
  connectedCount: number,
  maxGroups: number,
): GroupLimitSnapshot {
  const remaining = Math.max(0, maxGroups - connectedCount);
  const isAtLimit = connectedCount >= maxGroups;

  return {
    connectedCount,
    maxGroups,
    remaining,
    isAtLimit,
    canAddGroup: !isAtLimit,
  };
}

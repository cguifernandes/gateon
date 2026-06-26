import type { PlanId } from '../zod/plan-schemas';

export const DEFAULT_PLAN_ID: PlanId = 'free';

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

export const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Gratuito',
  starter: 'Starter',
  pro: 'Pro',
};

export function getMaxGroupsForPlan(planId: PlanId): number {
  return PLAN_GROUP_LIMITS[planId];
}

export function getMaxManagedMembersPerGroupForPlan(planId: PlanId): number {
  return PLAN_GROUP_MEMBER_LIMITS[planId];
}

export function isPaidPlan(planId: PlanId): boolean {
  return planId !== 'free';
}

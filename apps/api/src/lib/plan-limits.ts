import type { PlanId } from './zod/plan-schemas';

export const DEFAULT_PLAN_ID: PlanId = 'free';

export const PLAN_GROUP_LIMITS: Record<PlanId, number> = {
  free: 5,
  starter: 15,
  pro: 100,
};

export function getMaxGroupsForPlan(planId: PlanId): number {
  return PLAN_GROUP_LIMITS[planId];
}

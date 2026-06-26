import {
  getMaxGroupsForPlan,
  getMaxManagedMembersPerGroupForPlan,
} from '../../src/lib/plan/plan-limits';
import { getMaxAlertTemplatesForPlan } from '../../src/lib/plan/plan-features';
import { getMaxStripePaymentGroupsForPlan } from '../../src/lib/plan/stripe-payment-group-limits';
import type { PlanId } from '../../src/lib/zod/plan-schemas';

export type SupportedTestPlanId = Extract<PlanId, 'free' | 'starter'>;

export type PlanTestConfig = {
  planId: SupportedTestPlanId;
  groupTitlePrefix: string;
  /** Chat id for single-group plans (free). */
  singleGroupChatId?: string;
  singleGroupTitle?: string;
  /** Base for multi-group plans: chat id = base + index (1-based). */
  groupChatIdBase?: bigint;
  memberPrefix: string;
  templatePrefix: string;
  stripePriceIdPrefix: string;
  stripePlanLabelPrefix: string;
};

export const PLAN_TEST_CONFIG: Record<SupportedTestPlanId, PlanTestConfig> = {
  free: {
    planId: 'free',
    groupTitlePrefix: '[FREE-TEST]',
    singleGroupChatId: '-1009000000001',
    singleGroupTitle: '[FREE-TEST] Grupo limite',
    memberPrefix: 'free-test-member-',
    templatePrefix: 'FREE-TEST ',
    stripePriceIdPrefix: 'free-test-price-',
    stripePlanLabelPrefix: '[FREE-TEST]',
  },
  starter: {
    planId: 'starter',
    groupTitlePrefix: '[STARTER-TEST]',
    groupChatIdBase: BigInt(-1009000000100),
    memberPrefix: 'starter-test-member-',
    templatePrefix: 'STARTER-TEST ',
    stripePriceIdPrefix: 'starter-test-price-',
    stripePlanLabelPrefix: '[STARTER-TEST]',
  },
};

export function getPlanLimits(planId: SupportedTestPlanId) {
  return {
    groups: getMaxGroupsForPlan(planId),
    membersPerGroup: getMaxManagedMembersPerGroupForPlan(planId),
    stripePaymentGroups: getMaxStripePaymentGroupsForPlan(planId),
    alertTemplates: getMaxAlertTemplatesForPlan(planId),
  };
}

export function resolveTestGroupTargets(config: PlanTestConfig) {
  const limits = getPlanLimits(config.planId);

  if (config.singleGroupChatId && config.singleGroupTitle) {
    return [
      {
        index: 1,
        title: config.singleGroupTitle,
        telegramChatId: config.singleGroupChatId,
      },
    ];
  }

  if (!config.groupChatIdBase) {
    throw new Error(`Config inválida para plano ${config.planId}`);
  }

  const groupChatIdBase = config.groupChatIdBase;

  return Array.from({ length: limits.groups }, (_, offset) => {
    const index = offset + 1;
    return {
      index,
      title: `${config.groupTitlePrefix} Grupo ${index}`,
      telegramChatId: String(groupChatIdBase + BigInt(index)),
    };
  });
}

export function isTestGroup(
  config: PlanTestConfig,
  group: { title: string | null; telegramChatId: string },
): boolean {
  if (group.title?.startsWith(config.groupTitlePrefix)) {
    return true;
  }

  return resolveTestGroupTargets(config).some(
    (target) => target.telegramChatId === group.telegramChatId,
  );
}

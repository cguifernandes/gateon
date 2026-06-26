import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  buildPlanFeatureRequiredMessage,
  type PlanFeatureId,
  PLAN_FEATURE_REQUIRED_CODE,
  getMinPlanForFeature,
  hasPlanFeature,
} from '../../lib/plan/plan-features';
import {
  DEFAULT_PLAN_ID,
  getMaxGroupsForPlan,
  getMaxManagedMembersPerGroupForPlan,
} from '../../lib/plan/plan-limits';
import type { PlanId } from '../../lib/zod/plan-schemas';
import { PrismaService } from '../prisma/prisma.service';

export const GROUP_LIMIT_REACHED_CODE = 'GROUP_LIMIT_REACHED';

@Injectable()
export class GroupLimitService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve billing plan for the Gateon user account. */
  async resolvePlanId(userId: string): Promise<PlanId> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { planId: true },
    });

    return (user?.planId ?? DEFAULT_PLAN_ID) as PlanId;
  }

  async hasFeature(userId: string, feature: PlanFeatureId): Promise<boolean> {
    const planId = await this.resolvePlanId(userId);
    return hasPlanFeature(planId, feature);
  }

  async assertFeature(userId: string, feature: PlanFeatureId): Promise<void> {
    const planId = await this.resolvePlanId(userId);
    if (hasPlanFeature(planId, feature)) {
      return;
    }

    throw new ForbiddenException({
      error: PLAN_FEATURE_REQUIRED_CODE,
      feature,
      planId,
      requiredPlanId: getMinPlanForFeature(feature),
      message: buildPlanFeatureRequiredMessage(feature, planId),
    });
  }

  async getConnectedGroupCount(userId: string): Promise<number> {
    return this.prisma.telegramGroups.count({ where: { userId } });
  }

  async getMaxManagedMembersPerGroup(userId: string): Promise<number> {
    const planId = await this.resolvePlanId(userId);
    return getMaxManagedMembersPerGroupForPlan(planId);
  }

  /**
   * Blocks creating an additional Telegram group connection.
   * Re-connecting/updating a group the user already owns is allowed.
   */
  async assertCanConnectNewGroup(
    userId: string,
    telegramChatId?: string,
  ): Promise<void> {
    if (telegramChatId) {
      const existing = await this.prisma.telegramGroups.findUnique({
        where: { telegramChatId },
        select: { userId: true },
      });
      if (existing?.userId === userId) {
        return;
      }
    }

    const planId = await this.resolvePlanId(userId);
    const maxGroups = getMaxGroupsForPlan(planId);
    const connectedCount = await this.getConnectedGroupCount(userId);

    if (connectedCount >= maxGroups) {
      throw new ForbiddenException({
        error: GROUP_LIMIT_REACHED_CODE,
        message: `You have reached the limit of ${maxGroups} groups for your current plan.`,
        planId,
        maxGroups,
        connectedCount,
      });
    }
  }
}

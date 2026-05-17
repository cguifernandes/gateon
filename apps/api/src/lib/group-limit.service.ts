import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { DEFAULT_PLAN_ID, getMaxGroupsForPlan } from './plan-limits';
import type { PlanId } from './zod/plan-schemas';

export const GROUP_LIMIT_REACHED_CODE = 'GROUP_LIMIT_REACHED';

@Injectable()
export class GroupLimitService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve billing plan for user — wire to `Users.planId` when billing ships. */
  async resolvePlanId(_userId: string): Promise<PlanId> {
    return DEFAULT_PLAN_ID;
  }

  async getConnectedGroupCount(userId: string): Promise<number> {
    return this.prisma.telegramGroups.count({ where: { userId } });
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

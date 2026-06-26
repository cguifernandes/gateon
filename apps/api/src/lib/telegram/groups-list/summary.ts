import { matchesBotStatusFilter } from '../bot-status-filter';
import type { TelegramGroupsListPrisma } from './types';

export async function buildGroupsSummary(
  prisma: TelegramGroupsListPrisma,
  userId: string,
  trackedMemberLimitPerGroup: number,
) {
  const groups = await prisma.telegramGroups.findMany({
    where: { userId },
    select: {
      botStatus: true,
      _count: {
        select: {
          members: { where: { leftAt: null } },
        },
      },
    },
  });

  const totalGroups = groups.length;
  const pendingPermissionsCount = groups.filter((group) =>
    matchesBotStatusFilter(group.botStatus, 'warning'),
  ).length;
  const totalTracked = groups.reduce(
    (sum, group) => sum + group._count.members,
    0,
  );
  const totalCapacity = totalGroups * trackedMemberLimitPerGroup;
  const planMemberUsagePercent =
    totalCapacity <= 0
      ? 0
      : Math.min(100, Math.round((totalTracked / totalCapacity) * 100));

  return {
    totalGroups,
    pendingPermissionsCount,
    planMemberUsagePercent,
  };
}

export async function buildMembersSummary(
  prisma: TelegramGroupsListPrisma,
  userId: string,
) {
  const [activeCount, leftCount] = await Promise.all([
    prisma.telegramGroupMembers.count({
      where: { group: { userId }, leftAt: null },
    }),
    prisma.telegramGroupMembers.count({
      where: { group: { userId }, leftAt: { not: null } },
    }),
  ]);

  return {
    totalMembers: activeCount + leftCount,
    activeCount,
    leftCount,
  };
}

import type { Prisma } from '@prisma/client';
import { matchesBotStatusFilter } from '../bot-status-filter';
import {
  buildTelegramGroupsBaseWhere,
} from '../groups-list-filter';
import type { TelegramGroupsListQueryInput } from '../../zod/telegram-groups-list-query-schemas';
import {
  groupSelect,
  MEMBER_PREVIEW_LIMIT,
  type GroupRow,
  type TelegramGroupsListPrisma,
} from './types';

export async function resolveFilteredGroupIds(
  prisma: TelegramGroupsListPrisma,
  userId: string,
  query: TelegramGroupsListQueryInput,
) {
  const baseWhere = buildTelegramGroupsBaseWhere(userId, query);
  const candidates = await prisma.telegramGroups.findMany({
    where: baseWhere,
    orderBy: { connectedAt: 'desc' },
    select: { id: true, botStatus: true },
  });

  return candidates
    .filter((group) =>
      matchesBotStatusFilter(group.botStatus, query.status ?? 'all'),
    )
    .map((group) => group.id);
}

export async function loadGroupsByIds(
  prisma: TelegramGroupsListPrisma,
  pageIds: string[],
  membersView: boolean,
  includeMembersPreview: boolean,
  memberWhere: Prisma.TelegramGroupMembersWhereInput,
) {
  if (pageIds.length === 0) {
    return [];
  }

  const groups = await prisma.telegramGroups.findMany({
    where: { id: { in: pageIds } },
    select: {
      ...groupSelect,
      members: {
        where: membersView ? memberWhere : { leftAt: null },
        orderBy: membersView
          ? [{ leftAt: 'asc' }, { updatedAt: 'desc' }]
          : { updatedAt: 'desc' },
        ...(membersView
          ? {}
          : { take: includeMembersPreview ? MEMBER_PREVIEW_LIMIT : 0 }),
        select: {
          telegramUserId: true,
          firstName: true,
          lastName: true,
          profilePhotoFileId: true,
          isOwner: true,
          joinedAt: true,
          leftAt: true,
        },
      },
    },
  });

  const groupsById = new Map(groups.map((group) => [group.id, group]));
  return pageIds
    .map((id) => groupsById.get(id))
    .filter((group): group is GroupRow => group !== undefined);
}

import type { Prisma } from '@prisma/client';
import { matchesBotStatusFilter } from '../bot-status-filter';
import {
  buildTelegramGroupMembersWhere,
  buildTelegramGroupsBaseWhere,
  groupMatchesSearch,
} from '../groups-list-filter';
import type { TelegramGroupsListQueryInput } from '../../zod/telegram-groups-list-query-schemas';
import {
  groupSelect,
  MEMBER_PREVIEW_LIMIT,
  MEMBERS_PER_GROUP_PAGE_SIZE_DEFAULT,
  type GroupRow,
  type TelegramGroupsListPrisma,
} from './types';

type LoadGroupsByIdsInput = {
  pageIds: string[];
  membersView: boolean;
  includeMembersPreview: boolean;
  query: TelegramGroupsListQueryInput;
};

function resolveMembersPage(
  query: TelegramGroupsListQueryInput,
  groupId: string,
): number {
  return query.membersPages?.[groupId] ?? 1;
}

async function loadSingleGroup(
  prisma: TelegramGroupsListPrisma,
  groupId: string,
  input: LoadGroupsByIdsInput,
): Promise<GroupRow | undefined> {
  const { membersView, includeMembersPreview, query } = input;
  const membersPageSize =
    query.membersPerGroupPageSize ?? MEMBERS_PER_GROUP_PAGE_SIZE_DEFAULT;
  const membersPage = resolveMembersPage(query, groupId);

  const shell = await prisma.telegramGroups.findFirst({
    where: { id: groupId },
    select: { title: true, telegramChatId: true },
  });

  if (!shell) {
    return undefined;
  }

  const { memberWhere } = resolveMemberWhereForGroup(query, shell);

  const group = await prisma.telegramGroups.findFirst({
    where: { id: groupId },
    select: {
      ...groupSelect,
      members: {
        where: membersView ? memberWhere : { leftAt: null },
        orderBy: membersView
          ? [{ leftAt: 'asc' }, { updatedAt: 'desc' }]
          : { updatedAt: 'desc' },
        ...(membersView
          ? {
              skip: (membersPage - 1) * membersPageSize,
              take: membersPageSize,
            }
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

  return group ?? undefined;
}

export async function loadGroupsByIds(
  prisma: TelegramGroupsListPrisma,
  pageIds: string[],
  membersView: boolean,
  includeMembersPreview: boolean,
  memberWhere: Prisma.TelegramGroupMembersWhereInput,
  query: TelegramGroupsListQueryInput,
) {
  if (pageIds.length === 0) {
    return [];
  }

  const input: LoadGroupsByIdsInput = {
    pageIds,
    membersView,
    includeMembersPreview,
    query,
  };

  const groups = await Promise.all(
    pageIds.map((groupId) => loadSingleGroup(prisma, groupId, input)),
  );

  return pageIds
    .map((_, index) => groups[index])
    .filter((group): group is GroupRow => group !== undefined);
}

export async function countFilteredMembersForGroup(
  prisma: TelegramGroupsListPrisma,
  groupId: string,
  memberWhere: Prisma.TelegramGroupMembersWhereInput,
): Promise<number> {
  return prisma.telegramGroupMembers.count({
    where: {
      telegramGroupId: groupId,
      ...memberWhere,
    },
  });
}

export function buildMembersPaginationMeta(input: {
  page: number;
  pageSize: number;
  totalItems: number;
}) {
  const totalPages =
    input.totalItems === 0
      ? 0
      : Math.max(1, Math.ceil(input.totalItems / input.pageSize));

  return {
    page: input.page,
    pageSize: input.pageSize,
    totalItems: input.totalItems,
    totalPages,
    hasNextPage: input.page < totalPages,
    hasPreviousPage: input.page > 1,
  };
}

export function resolveMemberWhereForGroup(
  query: TelegramGroupsListQueryInput,
  group: Pick<GroupRow, 'title' | 'telegramChatId'>,
) {
  const groupMatches = groupMatchesSearch(group, query.q ?? '');
  return {
    memberWhere: buildTelegramGroupMembersWhere(query, {
      groupMatchesQuery: groupMatches,
    }),
    groupMatchesQuery: groupMatches,
  };
}

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

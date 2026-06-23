import type { Prisma } from '@prisma/client';
import { StripeBillingConnectionStatus } from '@prisma/client';
import { buildPaginationMeta, resolvePagination } from '../../lib/pagination';
import { matchesBotStatusFilter } from '../../lib/telegram-bot-status-filter';
import {
  buildTelegramGroupMembersWhere,
  buildTelegramGroupsBaseWhere,
  groupMatchesSearch,
  memberMatchesSearch,
  parseTelegramChatIdsFilter,
} from '../../lib/telegram-groups-list-filter';
import type { TelegramGroupsListQueryInput } from '../../lib/zod/telegram-groups-list-query-schemas';
import type { PrismaService } from '../prisma/prisma.service';

const MEMBER_PREVIEW_LIMIT = 50;

type TrackedMemberRow = {
  telegramUserId: string;
  firstName: string | null;
  lastName: string | null;
  profilePhotoFileId: string | null;
  isOwner: boolean;
  joinedAt: Date;
  leftAt: Date | null;
};

type GroupRow = {
  id: string;
  telegramChatId: string;
  title: string | null;
  chatPhotoFileId: string | null;
  type: string;
  isForum: boolean;
  botStatus: string;
  connectedAt: Date;
  updatedAt: Date;
  members: TrackedMemberRow[];
  _count: {
    members: number;
  };
};

type GroupsListDeps = {
  prisma: PrismaService;
  getTelegramChatMemberCount: (
    telegramChatId: string,
  ) => Promise<number | null>;
  mapTrackedMemberToDto: (
    groupId: string,
    member: TrackedMemberRow,
  ) => {
    telegramUserId: string;
    firstName: string | null;
    lastName: string | null;
    profilePhotoUrl: string | null;
    joinedAt: string;
    leftAt: string | null;
    status: 'active' | 'left';
    isOwner: boolean;
    linkedStripePlans: { connectionId: string; label: string }[];
  };
  withMemberStripePayerPlans: (
    groupId: string,
    member: ReturnType<GroupsListDeps['mapTrackedMemberToDto']>,
    plansByMemberKey: Map<string, { connectionId: string; label: string }[]>,
  ) => ReturnType<GroupsListDeps['mapTrackedMemberToDto']>;
  buildStripePayerPlansByMemberKey: (
    userId: string,
    groupIds: string[],
  ) => Promise<Map<string, { connectionId: string; label: string }[]>>;
  trackedMemberLimitPerGroup: number;
};

const groupSelect = {
  id: true,
  telegramChatId: true,
  title: true,
  chatPhotoFileId: true,
  type: true,
  isForum: true,
  botStatus: true,
  connectedAt: true,
  updatedAt: true,
  _count: {
    select: {
      members: { where: { leftAt: null } },
    },
  },
} satisfies Prisma.TelegramGroupsSelect;

async function buildGroupsSummary(
  prisma: PrismaService,
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

async function buildMembersSummary(prisma: PrismaService, userId: string) {
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

async function resolveFilteredGroupIds(
  prisma: PrismaService,
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

async function loadGroupsByIds(
  prisma: PrismaService,
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

function hasMembersViewFilters(query: TelegramGroupsListQueryInput): boolean {
  return Boolean(
    query.q?.trim() ||
    (query.memberStatus && query.memberStatus !== 'all') ||
    query.joinedFrom ||
    query.joinedTo ||
    query.leftFrom ||
    query.leftTo ||
    parseTelegramChatIdsFilter(query.telegramChatIds).length > 0,
  );
}

function filterMembersForMembersView(
  group: GroupRow,
  query: TelegramGroupsListQueryInput,
  memberWhere: Prisma.TelegramGroupMembersWhereInput,
) {
  const q = query.q?.trim() ?? '';

  const filteredMembers = group.members.filter((member) => {
    const status = member.leftAt ? 'left' : 'active';
    if (query.memberStatus === 'active' && status !== 'active') {
      return false;
    }
    if (query.memberStatus === 'left' && status !== 'left') {
      return false;
    }

    if (memberWhere.joinedAt && member.joinedAt) {
      const range = memberWhere.joinedAt as { gte?: Date; lte?: Date };
      if (range.gte && member.joinedAt < range.gte) return false;
      if (range.lte && member.joinedAt > range.lte) return false;
    }

    if (memberWhere.leftAt && member.leftAt) {
      const range = memberWhere.leftAt as { gte?: Date; lte?: Date };
      if (range.gte && member.leftAt < range.gte) return false;
      if (range.lte && member.leftAt > range.lte) return false;
    }

    return true;
  });

  if (!q) {
    return filteredMembers;
  }

  if (groupMatchesSearch(group, q)) {
    return filteredMembers;
  }

  return filteredMembers.filter((member) => memberMatchesSearch(member, q));
}

async function mapGroupsToResponse(
  deps: GroupsListDeps,
  userId: string,
  groups: GroupRow[],
  membersView: boolean,
  query: TelegramGroupsListQueryInput,
) {
  const groupIds = groups.map((group) => group.id);
  const stripeLinks = membersView
    ? []
    : groupIds.length > 0
      ? await deps.prisma.stripeBillingConnections.findMany({
          where: {
            userId,
            status: StripeBillingConnectionStatus.CONNECTED,
            telegramGroupId: { in: groupIds },
          },
          select: {
            id: true,
            telegramGroupId: true,
            monitoredPlanLabel: true,
            monitoredStripePriceId: true,
          },
        })
      : [];
  const stripePlansByGroupId = new Map<
    string,
    { connectionId: string; label: string }[]
  >();
  for (const link of stripeLinks) {
    if (!link.telegramGroupId) continue;
    const label =
      link.monitoredPlanLabel?.trim() ||
      link.monitoredStripePriceId ||
      'Plano Stripe';
    const current = stripePlansByGroupId.get(link.telegramGroupId) ?? [];
    current.push({ connectionId: link.id, label });
    stripePlansByGroupId.set(link.telegramGroupId, current);
  }

  const leftMemberCounts =
    groupIds.length > 0
      ? await deps.prisma.telegramGroupMembers.groupBy({
          by: ['telegramGroupId'],
          where: {
            telegramGroupId: { in: groupIds },
            leftAt: { not: null },
          },
          _count: { _all: true },
        })
      : [];
  const leftMemberCountByGroupId = new Map(
    leftMemberCounts.map((row) => [row.telegramGroupId, row._count._all]),
  );

  const stripePayerPlansByMemberKey = membersView
    ? query.includeMemberStripePlans
      ? await deps.buildStripePayerPlansByMemberKey(userId, groupIds)
      : new Map<string, { connectionId: string; label: string }[]>()
    : new Map<string, { connectionId: string; label: string }[]>();

  const memberWhere = buildTelegramGroupMembersWhere(query);
  const mappedGroups = [];

  for (const group of groups) {
    const telegramChatId = group.telegramChatId.trim();
    const members = membersView
      ? filterMembersForMembersView(group, query, memberWhere).map((member) =>
          deps.withMemberStripePayerPlans(
            group.id,
            deps.mapTrackedMemberToDto(group.id, member),
            stripePayerPlansByMemberKey,
          ),
        )
      : group.members.map((member) =>
          deps.mapTrackedMemberToDto(group.id, member),
        );

    if (
      membersView &&
      hasMembersViewFilters(query) &&
      members.length === 0 &&
      !groupMatchesSearch(group, query.q ?? '')
    ) {
      continue;
    }

    mappedGroups.push({
      id: group.id,
      telegramChatId,
      title: group.title,
      chatPhotoUrl: group.chatPhotoFileId
        ? `/api/telegram/groups/${group.id}/chat-photo`
        : null,
      type: group.type,
      isForum: group.isForum,
      botStatus: group.botStatus,
      connectedAt: group.connectedAt,
      updatedAt: group.updatedAt,
      memberCount: query.includeTelegramMemberCount
        ? await deps.getTelegramChatMemberCount(telegramChatId)
        : null,
      trackedMemberCount: group._count.members,
      leftMemberCount: leftMemberCountByGroupId.get(group.id) ?? 0,
      trackedMemberLimitPerGroup: deps.trackedMemberLimitPerGroup,
      trackedMemberLimitReached:
        group._count.members >= deps.trackedMemberLimitPerGroup,
      members,
      linkedStripePlans: membersView
        ? []
        : (stripePlansByGroupId.get(group.id) ?? []),
    });
  }

  return mappedGroups;
}

export async function resolveTelegramGroupsList(
  deps: GroupsListDeps,
  userId: string,
  query: TelegramGroupsListQueryInput,
  membersView: boolean,
) {
  const { skip, take, page, pageSize } = resolvePagination({
    page: query.page,
    pageSize: query.pageSize,
    all: query.all,
  });

  const filteredIds = await resolveFilteredGroupIds(deps.prisma, userId, query);
  const totalItems = filteredIds.length;
  const pageIds = query.all
    ? filteredIds
    : filteredIds.slice(skip, skip + take);
  const memberWhere = buildTelegramGroupMembersWhere(query);
  const groups = await loadGroupsByIds(
    deps.prisma,
    pageIds,
    membersView,
    Boolean(query.includeMembersPreview),
    memberWhere,
  );
  const mappedGroups = await mapGroupsToResponse(
    deps,
    userId,
    groups,
    membersView,
    query,
  );

  const [summary, membersSummary] = await Promise.all([
    buildGroupsSummary(deps.prisma, userId, deps.trackedMemberLimitPerGroup),
    membersView
      ? buildMembersSummary(deps.prisma, userId)
      : Promise.resolve(undefined),
  ]);

  return {
    groups: mappedGroups,
    pagination: buildPaginationMeta(page, pageSize, totalItems, query.all),
    summary,
    ...(membersSummary ? { membersSummary } : {}),
  };
}

import { StripeBillingConnectionStatus } from '@prisma/client';
import { buildTelegramGroupMembersWhere, groupMatchesSearch } from '../groups-list-filter';
import type { LinkedStripePlanSummary } from '../../stripe/telegram-member-links';
import type { TelegramGroupsListQueryInput } from '../../zod/telegram-groups-list-query-schemas';
import {
  filterMembersForMembersView,
  hasMembersViewFilters,
} from './members';
import type { GroupRow, GroupsListDeps } from './types';

export async function mapGroupsToResponse(
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
  const stripePlansByGroupId = new Map<string, LinkedStripePlanSummary[]>();
  for (const link of stripeLinks) {
    if (!link.telegramGroupId) continue;
    const label =
      link.monitoredPlanLabel?.trim() ||
      link.monitoredStripePriceId ||
      'Plano Stripe';
    const current = stripePlansByGroupId.get(link.telegramGroupId) ?? [];
    current.push({
      connectionId: link.id,
      label,
      cancelAtPeriodEnd: false,
    });
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
    ? query.includeMemberStripePlans !== false ||
      (query.stripePayer && query.stripePayer !== 'all')
      ? await deps.buildStripePayerPlansByMemberKey(userId, groupIds)
      : new Map<string, LinkedStripePlanSummary[]>()
    : new Map<string, LinkedStripePlanSummary[]>();

  const memberWhere = buildTelegramGroupMembersWhere(query);
  const mappedGroups = [];

  for (const group of groups) {
    const telegramChatId = group.telegramChatId.trim();
    const members = membersView
      ? filterMembersForMembersView(
          group,
          query,
          memberWhere,
          stripePayerPlansByMemberKey,
        ).map((member) =>
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

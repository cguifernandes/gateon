import type { Prisma } from '@prisma/client';
import {
  groupMatchesSearch,
  memberMatchesSearch,
  parseCommaSeparatedIdsFilter,
} from '../groups-list-filter';
import type { TelegramGroupsListQueryInput } from '../../zod/telegram-groups-list-query-schemas';
import {
  memberHasStripeCancelScheduled,
  type LinkedStripePlanSummary,
} from '../../stripe/telegram-member-links';
import type { GroupRow } from './types';

export function hasMembersViewFilters(query: TelegramGroupsListQueryInput): boolean {
  return Boolean(
    query.q?.trim() ||
    (query.memberStatus && query.memberStatus !== 'all') ||
    (query.stripePayer && query.stripePayer !== 'all') ||
    query.joinedFrom ||
    query.joinedTo ||
    query.leftFrom ||
    query.leftTo ||
    parseCommaSeparatedIdsFilter(query.telegramChatIds).length > 0,
  );
}

function memberIsStripePayer(
  groupId: string,
  telegramUserId: string,
  stripePayerPlansByMemberKey: Map<string, LinkedStripePlanSummary[]>,
): boolean {
  const plans =
    stripePayerPlansByMemberKey.get(`${groupId}:${telegramUserId}`) ?? [];
  return plans.length > 0;
}

function memberIsStripeCancelScheduled(
  groupId: string,
  telegramUserId: string,
  stripePayerPlansByMemberKey: Map<string, LinkedStripePlanSummary[]>,
): boolean {
  const plans =
    stripePayerPlansByMemberKey.get(`${groupId}:${telegramUserId}`) ?? [];
  return memberHasStripeCancelScheduled(plans);
}

export function filterMembersForMembersView(
  group: GroupRow,
  query: TelegramGroupsListQueryInput,
  memberWhere: Prisma.TelegramGroupMembersWhereInput,
  stripePayerPlansByMemberKey: Map<string, LinkedStripePlanSummary[]>,
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

    if (query.stripePayer === 'payer') {
      if (
        !memberIsStripePayer(
          group.id,
          member.telegramUserId,
          stripePayerPlansByMemberKey,
        )
      ) {
        return false;
      }
    }

    if (query.stripePayer === 'non_payer') {
      if (
        memberIsStripePayer(
          group.id,
          member.telegramUserId,
          stripePayerPlansByMemberKey,
        )
      ) {
        return false;
      }
    }

    if (query.stripePayer === 'cancel_scheduled') {
      if (
        !memberIsStripeCancelScheduled(
          group.id,
          member.telegramUserId,
          stripePayerPlansByMemberKey,
        )
      ) {
        return false;
      }
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

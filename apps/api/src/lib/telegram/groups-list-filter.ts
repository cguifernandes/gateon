import type { Prisma } from '@prisma/client';
import { StripeBillingConnectionStatus } from '@prisma/client';
import { buildDateParamRange } from '../query/date-param-range';
import type { TelegramGroupsListQueryInput } from '../zod/telegram-groups-list-query-schemas';

export function parseCommaSeparatedIdsFilter(raw?: string): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function buildTelegramGroupsBaseWhere(
  userId: string,
  query: TelegramGroupsListQueryInput,
): Prisma.TelegramGroupsWhereInput {
  const connectedRange = buildDateParamRange(query.from, query.to);
  const telegramChatIds = parseCommaSeparatedIdsFilter(query.telegramChatIds);
  const stripeConnectionIds = parseCommaSeparatedIdsFilter(
    query.stripeConnectionIds,
  );
  const q = query.q?.trim();

  const where: Prisma.TelegramGroupsWhereInput = {
    userId,
    ...(connectedRange ? { connectedAt: connectedRange } : {}),
    ...(telegramChatIds.length > 0
      ? { telegramChatId: { in: telegramChatIds } }
      : {}),
    ...(stripeConnectionIds.length > 0
      ? {
          stripeBillingConnections: {
            some: {
              id: { in: stripeConnectionIds },
              status: StripeBillingConnectionStatus.CONNECTED,
            },
          },
        }
      : {}),
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { telegramChatId: { contains: q, mode: 'insensitive' } },
      {
        members: {
          some: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { telegramUserId: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      },
    ];
  }

  return where;
}

export function buildTelegramGroupMembersWhere(
  query: TelegramGroupsListQueryInput,
): Prisma.TelegramGroupMembersWhereInput {
  const joinedRange = buildDateParamRange(query.joinedFrom, query.joinedTo);
  const leftRange = buildDateParamRange(query.leftFrom, query.leftTo);
  const memberStatus = query.memberStatus ?? 'all';

  const where: Prisma.TelegramGroupMembersWhereInput = {
    ...(joinedRange ? { joinedAt: joinedRange } : {}),
    ...(memberStatus === 'active' ? { leftAt: null } : {}),
    ...(memberStatus === 'left' ? { leftAt: { not: null } } : {}),
  };

  if (leftRange) {
    where.leftAt = leftRange;
  }

  return where;
}

export function groupMatchesSearch(
  group: {
    title: string | null;
    telegramChatId: string;
  },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }

  return (
    (group.title ?? '').toLowerCase().includes(q) ||
    group.telegramChatId.toLowerCase().includes(q)
  );
}

export function memberMatchesSearch(
  member: {
    telegramUserId: string;
    firstName: string | null;
    lastName: string | null;
  },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }

  const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`
    .trim()
    .toLowerCase();

  return (
    member.telegramUserId.toLowerCase().includes(q) ||
    fullName.includes(q) ||
    (member.firstName ?? '').toLowerCase().includes(q) ||
    (member.lastName ?? '').toLowerCase().includes(q)
  );
}

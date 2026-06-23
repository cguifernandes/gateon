import type { Prisma } from '@prisma/client';
import { StripeBillingConnectionStatus } from '@prisma/client';
import { endOfDay, startOfDay } from 'date-fns';
import type { TelegramGroupsListQueryInput } from './zod/telegram-groups-list-query-schemas';

function parseDateParam(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function buildInclusiveDateParamRange(
  from?: string,
  to?: string,
): { gte: Date; lte: Date } | undefined {
  return buildDateRange(from, to);
}

function buildDateRange(
  from?: string,
  to?: string,
): { gte: Date; lte: Date } | undefined {
  const fromDate = parseDateParam(from);
  if (!fromDate) {
    return undefined;
  }

  const toDate = parseDateParam(to) ?? fromDate;
  return {
    gte: startOfDay(fromDate),
    lte: endOfDay(toDate),
  };
}

export function parseCommaSeparatedIdsFilter(raw?: string): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseTelegramChatIdsFilter(raw?: string): string[] {
  return parseCommaSeparatedIdsFilter(raw);
}

export function parseStripeConnectionIdsFilter(raw?: string): string[] {
  return parseCommaSeparatedIdsFilter(raw);
}

export function buildTelegramGroupsBaseWhere(
  userId: string,
  query: TelegramGroupsListQueryInput,
): Prisma.TelegramGroupsWhereInput {
  const connectedRange = buildDateRange(query.from, query.to);
  const telegramChatIds = parseTelegramChatIdsFilter(query.telegramChatIds);
  const stripeConnectionIds = parseStripeConnectionIdsFilter(
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
  const joinedRange = buildDateRange(query.joinedFrom, query.joinedTo);
  const leftRange = buildDateRange(query.leftFrom, query.leftTo);
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

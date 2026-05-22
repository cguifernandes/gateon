import type { DateRangeValue } from "@/components/filters-popever";
import { matchesConnectedAtRange } from "@/lib/groups-filter";

type TrackedMemberStatus = "active" | "left";

type MemberFilterFields = {
  status: TrackedMemberStatus;
  joinedAt: string;
  leftAt: string | null;
};

export type MemberStatusFilterValue = "all" | "active" | "left";

export const MEMBER_STATUS_FILTER_OPTIONS: {
  value: MemberStatusFilterValue;
  label: string;
}[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativo" },
  { value: "left", label: "Saiu" },
];

export function matchesMemberStatusFilter(
  status: TrackedMemberStatus,
  filter: MemberStatusFilterValue,
): boolean {
  if (filter === "all") {
    return true;
  }

  return status === filter;
}

export function matchesJoinedAtRange(
  joinedAtIso: string,
  range: DateRangeValue,
): boolean {
  return matchesConnectedAtRange(joinedAtIso, range);
}

export function matchesLeftAtRange(
  leftAtIso: string | null,
  range: DateRangeValue,
): boolean {
  if (!range?.from) {
    return true;
  }

  if (!leftAtIso) {
    return false;
  }

  return matchesConnectedAtRange(leftAtIso, range);
}

export function matchesTelegramChatIdFilter(
  telegramChatId: string,
  filterTelegramChatId: string,
): boolean {
  if (filterTelegramChatId === "all") {
    return true;
  }

  return telegramChatId.trim() === filterTelegramChatId.trim();
}

export function memberPassesPopoverFilters(
  member: MemberFilterFields,
  filters: {
    memberStatus: MemberStatusFilterValue;
    joinedRange: DateRangeValue;
    leftRange: DateRangeValue;
  },
): boolean {
  return (
    matchesMemberStatusFilter(member.status, filters.memberStatus) &&
    matchesJoinedAtRange(member.joinedAt, filters.joinedRange) &&
    matchesLeftAtRange(member.leftAt, filters.leftRange)
  );
}

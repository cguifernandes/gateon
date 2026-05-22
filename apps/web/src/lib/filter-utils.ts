import type { DateRangeValue } from "@/components/filters-popever";
import type { GroupsUrlFiltersState } from "@/lib/groups-url-filters";
import type { MembersUrlFiltersState } from "@/lib/members-url-filters";

export function areDateRangesEqual(
  a: DateRangeValue,
  b: DateRangeValue,
): boolean {
  const fromA = a?.from?.getTime();
  const fromB = b?.from?.getTime();

  if (fromA === undefined && fromB === undefined) {
    return true;
  }

  if (fromA === undefined || fromB === undefined) {
    return false;
  }

  const toA = a?.to?.getTime() ?? fromA;
  const toB = b?.to?.getTime() ?? fromB;

  return fromA === fromB && toA === toB;
}

export const EMPTY_GROUPS_URL_FILTERS: GroupsUrlFiltersState = {
  botStatus: "all",
  connectedRange: undefined,
};

export const EMPTY_MEMBERS_URL_FILTERS: MembersUrlFiltersState = {
  memberStatus: "all",
  joinedRange: undefined,
  leftRange: undefined,
  telegramChatId: "all",
};

export function areGroupsUrlFiltersEqual(
  a: GroupsUrlFiltersState,
  b: GroupsUrlFiltersState,
): boolean {
  return (
    a.botStatus === b.botStatus &&
    areDateRangesEqual(a.connectedRange, b.connectedRange)
  );
}

export function areMembersUrlFiltersEqual(
  a: MembersUrlFiltersState,
  b: MembersUrlFiltersState,
): boolean {
  return (
    a.memberStatus === b.memberStatus &&
    a.telegramChatId === b.telegramChatId &&
    areDateRangesEqual(a.joinedRange, b.joinedRange) &&
    areDateRangesEqual(a.leftRange, b.leftRange)
  );
}

export function countActiveGroupsUrlFilters(state: GroupsUrlFiltersState): number {
  let count = 0;

  if (state.botStatus !== "all") {
    count += 1;
  }

  if (state.connectedRange?.from !== undefined) {
    count += 1;
  }

  return count;
}

export function countActiveMembersUrlFilters(
  state: MembersUrlFiltersState,
): number {
  let count = 0;

  if (state.memberStatus !== "all") {
    count += 1;
  }

  if (state.telegramChatId !== "all") {
    count += 1;
  }

  if (state.joinedRange?.from !== undefined) {
    count += 1;
  }

  if (state.leftRange?.from !== undefined) {
    count += 1;
  }

  return count;
}

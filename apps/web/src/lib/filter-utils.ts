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
  telegramChatIds: [],
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

function areTelegramChatIdListsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const sortedA = [...a].map((id) => id.trim()).sort();
  const sortedB = [...b].map((id) => id.trim()).sort();

  return sortedA.every((id, index) => id === sortedB[index]);
}

export function areMembersUrlFiltersEqual(
  a: MembersUrlFiltersState,
  b: MembersUrlFiltersState,
): boolean {
  return (
    a.memberStatus === b.memberStatus &&
    areTelegramChatIdListsEqual(a.telegramChatIds, b.telegramChatIds) &&
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

  if (state.telegramChatIds.length > 0) {
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

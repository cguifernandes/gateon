"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { DateRangeValue } from "@/components/filters-popever";
import { usePendingUrlFiltersApply } from "@/hooks/use-pending-url-filters";
import {
  areMembersUrlFiltersEqual,
  countActiveMembersUrlFilters,
  EMPTY_MEMBERS_URL_FILTERS,
} from "@/lib/filter-utils";
import type { MemberStatusFilterValue } from "@/lib/members-filter";
import {
  buildMembersUrlFiltersSearchParams,
  type MembersUrlFiltersState,
  parseMembersUrlFiltersFromSearchParams,
} from "@/lib/members-url-filters";

export type MembersFiltersPopoverControl = {
  draft: MembersUrlFiltersState;
  setMemberStatus: (value: MemberStatusFilterValue) => void;
  setJoinedRange: (value: DateRangeValue) => void;
  setLeftRange: (value: DateRangeValue) => void;
  setTelegramChatIds: (value: string[]) => void;
  syncDraftFromUrl: () => void;
  apply: () => void;
  clear: () => void;
  hasPendingChanges: boolean;
  isFiltersPending: boolean;
  appliedActiveCount: number;
};

export function useMembersFiltersUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlFilters = useMemo(
    () => parseMembersUrlFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const [draftFilters, setDraftFilters] =
    useState<MembersUrlFiltersState>(urlFilters);
  const [search, setSearch] = useState("");
  const { isFiltersPending, markFiltersPending } = usePendingUrlFiltersApply(
    urlFilters,
    areMembersUrlFiltersEqual,
  );

  useEffect(() => {
    setDraftFilters(urlFilters);
  }, [urlFilters]);

  const pushUrlFilters = useCallback(
    (next: MembersUrlFiltersState) => {
      const params = buildMembersUrlFiltersSearchParams(next, searchParams);
      const qs = params.toString();

      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const syncDraftFromUrl = useCallback(() => {
    setDraftFilters(urlFilters);
  }, [urlFilters]);

  const setMemberStatus = useCallback((memberStatus: MemberStatusFilterValue) => {
    setDraftFilters((current) => ({ ...current, memberStatus }));
  }, []);

  const setJoinedRange = useCallback((joinedRange: DateRangeValue) => {
    setDraftFilters((current) => ({ ...current, joinedRange }));
  }, []);

  const setLeftRange = useCallback((leftRange: DateRangeValue) => {
    setDraftFilters((current) => ({ ...current, leftRange }));
  }, []);

  const setTelegramChatIds = useCallback((telegramChatIds: string[]) => {
    setDraftFilters((current) => ({ ...current, telegramChatIds }));
  }, []);

  const apply = useCallback(() => {
    markFiltersPending(draftFilters);
    pushUrlFilters(draftFilters);
  }, [draftFilters, markFiltersPending, pushUrlFilters]);

  const clear = useCallback(() => {
    setDraftFilters(EMPTY_MEMBERS_URL_FILTERS);
    markFiltersPending(EMPTY_MEMBERS_URL_FILTERS);
    pushUrlFilters(EMPTY_MEMBERS_URL_FILTERS);
  }, [markFiltersPending, pushUrlFilters]);

  const clearSearch = useCallback(() => {
    setSearch("");
  }, []);

  const filtersPopover: MembersFiltersPopoverControl = {
    draft: draftFilters,
    setMemberStatus,
    setJoinedRange,
    setLeftRange,
    setTelegramChatIds,
    syncDraftFromUrl,
    apply,
    clear,
    hasPendingChanges: !areMembersUrlFiltersEqual(draftFilters, urlFilters),
    isFiltersPending,
    appliedActiveCount: countActiveMembersUrlFilters(urlFilters),
  };

  return {
    search,
    setSearch,
    clearSearch,
    urlFilters,
    filtersPopover,
  };
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type { DateRangeValue } from "@/components/filters-popever";
import { usePendingUrlFiltersApply } from "@/hooks/use-pending-url-filters";
import {
  areGroupsUrlFiltersEqual,
  countActiveGroupsUrlFilters,
  EMPTY_GROUPS_URL_FILTERS,
} from "@/lib/filters/utils";
import {
  buildGroupsUrlFiltersSearchParams,
  type GroupsUrlFiltersState,
  parseGroupsUrlFiltersFromSearchParams,
} from "@/lib/groups/url-filters";
import type { BotStatusFilterValue } from "@/lib/telegram/bot-status";

export type GroupsFiltersPopoverControl = {
  draft: GroupsUrlFiltersState;
  setBotStatus: (value: BotStatusFilterValue) => void;
  setConnectedRange: (value: DateRangeValue) => void;
  setStripeConnectionIds: (value: string[]) => void;
  syncDraftFromUrl: () => void;
  apply: () => void;
  clear: () => void;
  hasPendingChanges: boolean;
  isFiltersPending: boolean;
  appliedActiveCount: number;
};

export function useGroupsFiltersUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlFilters = useMemo(
    () => parseGroupsUrlFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const [draftFilters, setDraftFilters] =
    useState<GroupsUrlFiltersState>(urlFilters);
  const [search, setSearch] = useState("");
  const { isFiltersPending, markFiltersPending } = usePendingUrlFiltersApply(
    urlFilters,
    areGroupsUrlFiltersEqual,
  );

  useEffect(() => {
    setDraftFilters(urlFilters);
  }, [urlFilters]);

  const pushUrlFilters = useCallback(
    (next: GroupsUrlFiltersState) => {
      const params = buildGroupsUrlFiltersSearchParams(next, searchParams);
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

  const setBotStatus = useCallback((botStatus: BotStatusFilterValue) => {
    setDraftFilters((current) => ({ ...current, botStatus }));
  }, []);

  const setConnectedRange = useCallback((connectedRange: DateRangeValue) => {
    setDraftFilters((current) => ({ ...current, connectedRange }));
  }, []);

  const setStripeConnectionIds = useCallback(
    (stripeConnectionIds: string[]) => {
      setDraftFilters((current) => ({ ...current, stripeConnectionIds }));
    },
    [],
  );

  const apply = useCallback(() => {
    markFiltersPending(draftFilters);
    pushUrlFilters(draftFilters);
  }, [draftFilters, markFiltersPending, pushUrlFilters]);

  const clear = useCallback(() => {
    setDraftFilters(EMPTY_GROUPS_URL_FILTERS);
    markFiltersPending(EMPTY_GROUPS_URL_FILTERS);
    pushUrlFilters(EMPTY_GROUPS_URL_FILTERS);
  }, [markFiltersPending, pushUrlFilters]);

  const clearSearch = useCallback(() => {
    setSearch("");
  }, []);

  const filtersPopover: GroupsFiltersPopoverControl = {
    draft: draftFilters,
    setBotStatus,
    setConnectedRange,
    setStripeConnectionIds,
    syncDraftFromUrl,
    apply,
    clear,
    hasPendingChanges: !areGroupsUrlFiltersEqual(draftFilters, urlFilters),
    isFiltersPending,
    appliedActiveCount: countActiveGroupsUrlFilters(urlFilters),
  };

  return {
    search,
    setSearch,
    clearSearch,
    urlFilters,
    filtersPopover,
  };
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import type { DateRangeValue } from "@/components/filters-popever";
import {
  buildGroupsUrlFiltersSearchParams,
  type GroupsUrlFiltersState,
  parseGroupsUrlFiltersFromSearchParams,
} from "@/lib/groups-url-filters";
import type { BotStatusFilterValue } from "@/lib/telegram-bot-status";

export function useGroupsFiltersUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const filtersFromUrl = useMemo(
    () => parseGroupsUrlFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const [search, setSearch] = useState("");

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

  const setBotStatusFilter = useCallback(
    (botStatus: BotStatusFilterValue) => {
      pushUrlFilters({ ...filtersFromUrl, botStatus });
    },
    [filtersFromUrl, pushUrlFilters],
  );

  const setConnectedRange = useCallback(
    (connectedRange: DateRangeValue) => {
      pushUrlFilters({ ...filtersFromUrl, connectedRange });
    },
    [filtersFromUrl, pushUrlFilters],
  );

  const clearPopoverFilters = useCallback(() => {
    pushUrlFilters({
      botStatus: "all",
      connectedRange: undefined,
    });
  }, [pushUrlFilters]);

  const clearSearch = useCallback(() => {
    setSearch("");
  }, []);

  return {
    search,
    setSearch,
    botStatusFilter: filtersFromUrl.botStatus,
    connectedRange: filtersFromUrl.connectedRange,
    setBotStatusFilter,
    setConnectedRange,
    clearPopoverFilters,
    clearSearch,
  };
}

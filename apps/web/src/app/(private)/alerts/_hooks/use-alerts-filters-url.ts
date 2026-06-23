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
  type AlertsUrlFiltersState,
  buildAlertsUrlFiltersSearchParams,
  parseAlertsUrlFiltersFromSearchParams,
} from "@/lib/alerts-url-filters";
import {
  areAlertsUrlFiltersEqual,
  countActiveAlertsUrlFilters,
  EMPTY_ALERTS_URL_FILTERS,
} from "@/lib/filter-utils";
import type {
  AlertDestinationType,
  AlertStatus,
} from "@/lib/zod/alert-schemas";

export type AlertsFiltersControl = {
  draft: AlertsUrlFiltersState;
  setStatus: (value: AlertStatus | "all") => void;
  setDestination: (value: AlertDestinationType | "all") => void;
  setGroupId: (value: string | "all") => void;
  setCreatedRange: (value: DateRangeValue) => void;
  syncDraftFromUrl: () => void;
  apply: () => void;
  clear: () => void;
  hasPendingChanges: boolean;
  isFiltersPending: boolean;
  appliedActiveCount: number;
};

export function useAlertsFiltersUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlFilters = useMemo(
    () => parseAlertsUrlFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const [draftFilters, setDraftFilters] =
    useState<AlertsUrlFiltersState>(urlFilters);
  const { isFiltersPending, markFiltersPending } = usePendingUrlFiltersApply(
    urlFilters,
    areAlertsUrlFiltersEqual,
  );

  useEffect(() => {
    setDraftFilters(urlFilters);
  }, [urlFilters]);

  const pushUrlFilters = useCallback(
    (next: AlertsUrlFiltersState) => {
      const params = buildAlertsUrlFiltersSearchParams(next, searchParams);
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

  const setStatus = useCallback((status: AlertStatus | "all") => {
    setDraftFilters((current) => ({ ...current, status }));
  }, []);

  const setDestination = useCallback(
    (destination: AlertDestinationType | "all") => {
      setDraftFilters((current) => ({ ...current, destination }));
    },
    [],
  );

  const setGroupId = useCallback((groupId: string | "all") => {
    setDraftFilters((current) => ({ ...current, groupId }));
  }, []);

  const setCreatedRange = useCallback((createdRange: DateRangeValue) => {
    setDraftFilters((current) => ({ ...current, createdRange }));
  }, []);

  const apply = useCallback(() => {
    markFiltersPending(draftFilters);
    pushUrlFilters(draftFilters);
  }, [draftFilters, markFiltersPending, pushUrlFilters]);

  const clear = useCallback(() => {
    setDraftFilters(EMPTY_ALERTS_URL_FILTERS);
    markFiltersPending(EMPTY_ALERTS_URL_FILTERS);
    pushUrlFilters(EMPTY_ALERTS_URL_FILTERS);
  }, [markFiltersPending, pushUrlFilters]);

  const control: AlertsFiltersControl = {
    draft: draftFilters,
    setStatus,
    setDestination,
    setGroupId,
    setCreatedRange,
    syncDraftFromUrl,
    apply,
    clear,
    hasPendingChanges: !areAlertsUrlFiltersEqual(draftFilters, urlFilters),
    isFiltersPending,
    appliedActiveCount: countActiveAlertsUrlFilters(urlFilters),
  };

  return { urlFilters, control };
}

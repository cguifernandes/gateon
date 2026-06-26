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
  areMembersUrlFiltersEqual,
  countActiveMembersUrlFilters,
  EMPTY_MEMBERS_URL_FILTERS,
} from "@/lib/filters/utils";
import type { MemberStatusFilterValue } from "@/lib/members/filter";
import {
  buildMembersUrlFiltersSearchParams,
  type MembersUrlFiltersState,
  parseMembersUrlFiltersFromSearchParams,
} from "@/lib/members/url-filters";
import type { StripePayerFilterValue } from "@/lib/stripe/payer-filter";
import type { MembersPerGroupPageSize } from "@/lib/zod/pagination-schemas";

export type MembersFiltersPopoverControl = {
  draft: MembersUrlFiltersState;
  draftMembersPerGroupPageSize: MembersPerGroupPageSize;
  setMemberStatus: (value: MemberStatusFilterValue) => void;
  setStripePayer: (value: StripePayerFilterValue) => void;
  setJoinedRange: (value: DateRangeValue) => void;
  setLeftRange: (value: DateRangeValue) => void;
  setTelegramChatIds: (value: string[]) => void;
  setMembersPerGroupPageSize: (value: MembersPerGroupPageSize) => void;
  syncDraftFromUrl: () => void;
  apply: () => void;
  clear: () => void;
  hasPendingChanges: boolean;
  isFiltersPending: boolean;
  appliedActiveCount: number;
};

type UseMembersFiltersUrlOptions = {
  membersPerGroupPageSize: MembersPerGroupPageSize;
  onApplyMembersPerGroupPageSize: (value: MembersPerGroupPageSize) => void;
};

export function useMembersFiltersUrl({
  membersPerGroupPageSize,
  onApplyMembersPerGroupPageSize,
}: UseMembersFiltersUrlOptions) {
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
  const [draftMembersPerGroupPageSize, setDraftMembersPerGroupPageSize] =
    useState<MembersPerGroupPageSize>(membersPerGroupPageSize);
  const [search, setSearch] = useState("");
  const { isFiltersPending, markFiltersPending } = usePendingUrlFiltersApply(
    urlFilters,
    areMembersUrlFiltersEqual,
  );

  useEffect(() => {
    setDraftFilters(urlFilters);
  }, [urlFilters]);

  useEffect(() => {
    setDraftMembersPerGroupPageSize(membersPerGroupPageSize);
  }, [membersPerGroupPageSize]);

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
    setDraftMembersPerGroupPageSize(membersPerGroupPageSize);
  }, [membersPerGroupPageSize, urlFilters]);

  const setMemberStatus = useCallback(
    (memberStatus: MemberStatusFilterValue) => {
      setDraftFilters((current) => ({ ...current, memberStatus }));
    },
    [],
  );

  const setStripePayer = useCallback((stripePayer: StripePayerFilterValue) => {
    setDraftFilters((current) => ({ ...current, stripePayer }));
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

  const setMembersPerGroupPageSize = useCallback(
    (next: MembersPerGroupPageSize) => {
      setDraftMembersPerGroupPageSize(next);
    },
    [],
  );

  const apply = useCallback(() => {
    markFiltersPending(draftFilters);
    pushUrlFilters(draftFilters);

    if (draftMembersPerGroupPageSize !== membersPerGroupPageSize) {
      onApplyMembersPerGroupPageSize(draftMembersPerGroupPageSize);
    }
  }, [
    draftFilters,
    draftMembersPerGroupPageSize,
    markFiltersPending,
    membersPerGroupPageSize,
    onApplyMembersPerGroupPageSize,
    pushUrlFilters,
  ]);

  const clear = useCallback(() => {
    setDraftFilters(EMPTY_MEMBERS_URL_FILTERS);
    setDraftMembersPerGroupPageSize(membersPerGroupPageSize);
    markFiltersPending(EMPTY_MEMBERS_URL_FILTERS);
    pushUrlFilters(EMPTY_MEMBERS_URL_FILTERS);
  }, [markFiltersPending, membersPerGroupPageSize, pushUrlFilters]);

  const clearSearch = useCallback(() => {
    setSearch("");
  }, []);

  const filtersPopover: MembersFiltersPopoverControl = {
    draft: draftFilters,
    draftMembersPerGroupPageSize,
    setMemberStatus,
    setStripePayer,
    setJoinedRange,
    setLeftRange,
    setTelegramChatIds,
    setMembersPerGroupPageSize,
    syncDraftFromUrl,
    apply,
    clear,
    hasPendingChanges:
      !areMembersUrlFiltersEqual(draftFilters, urlFilters) ||
      draftMembersPerGroupPageSize !== membersPerGroupPageSize,
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

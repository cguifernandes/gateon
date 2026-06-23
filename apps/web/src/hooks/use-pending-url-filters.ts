"use client";

import { useCallback, useEffect, useState } from "react";

export function usePendingUrlFiltersApply<T>(
  urlFilters: T,
  isEqual: (left: T, right: T) => boolean,
) {
  const [pendingFilters, setPendingFilters] = useState<T | null>(null);

  const markFiltersPending = useCallback((next: T) => {
    setPendingFilters(next);
  }, []);

  useEffect(() => {
    if (pendingFilters !== null && isEqual(urlFilters, pendingFilters)) {
      setPendingFilters(null);
    }
  }, [urlFilters, pendingFilters, isEqual]);

  return {
    isFiltersPending: pendingFilters !== null,
    markFiltersPending,
  };
}

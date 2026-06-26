export type TableResultsEmptyKind = "search" | "filters";

export type ResolveTableEmptyStateInput = {
  visibleRowCount: number;
  totalItems: number;
  searchInput: string;
  debouncedSearch: string;
  hasActiveFilters: boolean;
  isRefreshing: boolean;
};

export type ResolveTableEmptyStateResult = {
  show: boolean;
  kind: TableResultsEmptyKind | null;
};

export function resolveTableEmptyState(
  input: ResolveTableEmptyStateInput,
): ResolveTableEmptyStateResult {
  const {
    visibleRowCount,
    totalItems,
    searchInput,
    debouncedSearch,
    hasActiveFilters,
    isRefreshing,
  } = input;

  if (visibleRowCount > 0) {
    return { show: false, kind: null };
  }

  const searchInputActive = searchInput.trim().length > 0;
  const searchCommitted = debouncedSearch.length > 0;

  if (searchCommitted || searchInputActive) {
    return { show: true, kind: "search" };
  }

  if (hasActiveFilters && totalItems === 0) {
    return { show: true, kind: "filters" };
  }

  if (isRefreshing) {
    return { show: true, kind: hasActiveFilters ? "filters" : "search" };
  }

  if (totalItems === 0) {
    return { show: true, kind: hasActiveFilters ? "filters" : "search" };
  }

  return { show: false, kind: null };
}

import { formatAlertsFilterDate } from "@/lib/alerts-url-filters";
import type { AlertsUrlFiltersState } from "@/lib/alerts-url-filters";
import { DEFAULT_PAGE_SIZE } from "@/lib/zod/pagination-schemas";

type BuildAlertsListParamsInput = {
  page?: number;
  pageSize?: number;
  all?: boolean;
  search?: string;
  urlFilters?: AlertsUrlFiltersState;
};

export function buildAlertsListSearchParams(
  input: BuildAlertsListParamsInput,
): URLSearchParams {
  const params = new URLSearchParams();

  if (input.all) {
    params.set("all", "true");
  } else {
    params.set("page", String(input.page ?? 1));
    params.set("pageSize", String(input.pageSize ?? DEFAULT_PAGE_SIZE));
  }

  const search = input.search?.trim();
  if (search) {
    params.set("q", search);
  }

  const filters = input.urlFilters;
  if (!filters) {
    return params;
  }

  if (filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.destination !== "all") {
    params.set("destinationType", filters.destination);
  }

  if (filters.groupId !== "all") {
    params.set("groupId", filters.groupId);
  }

  if (filters.createdRange?.from) {
    params.set("createdFrom", formatAlertsFilterDate(filters.createdRange.from));
    if (filters.createdRange.to) {
      params.set("createdTo", formatAlertsFilterDate(filters.createdRange.to));
    }
  }

  return params;
}

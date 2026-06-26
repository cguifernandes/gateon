import type { AlertsUrlFiltersState } from "@/lib/alerts/url-filters";
import { formatUrlDateParam } from "@/lib/filters/date-params";
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
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;

  if (input.all) {
    params.set("all", "true");
    return params;
  }

  params.set("page", String(input.page ?? 1));
  params.set("pageSize", String(pageSize));

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
    params.set("destination", filters.destination);
  }

  if (filters.groupId !== "all") {
    params.set("groupId", filters.groupId);
  }

  if (filters.createdRange?.from) {
    params.set("createdFrom", formatUrlDateParam(filters.createdRange.from));
    if (filters.createdRange.to) {
      params.set("createdTo", formatUrlDateParam(filters.createdRange.to));
    }
  }

  return params;
}

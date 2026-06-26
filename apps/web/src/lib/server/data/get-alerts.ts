import type { AlertsUrlFiltersState } from "@/lib/alerts/url-filters";
import { buildAlertsListSearchParams } from "@/lib/query/alerts-list-params";
import {
  type AlertsResponseDto,
  alertsResponseSchema,
} from "@/lib/zod/alert-schemas";
import type { PaginationMeta } from "@/lib/zod/pagination-schemas";
import { DEFAULT_PAGE_SIZE } from "@/lib/zod/pagination-schemas";
import {
  fetchAuthenticatedUpstreamJson,
  resolveUpstreamSession,
} from "../fetch/authenticated-upstream";

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

const EMPTY_ALERTS: AlertsResponseDto = {
  alerts: [],
  stats: {
    activeCount: 0,
    sentToday: 0,
    deliveryRate: 0,
    draftCount: 0,
  },
  pagination: EMPTY_PAGINATION,
};

type GetAlertsOptions = {
  page?: number;
  pageSize?: number;
  all?: boolean;
  search?: string;
  urlFilters?: AlertsUrlFiltersState;
};

export async function getAlerts(options: GetAlertsOptions = {}): Promise<{
  data: AlertsResponseDto;
  error: string | null;
}> {
  const session = await resolveUpstreamSession();
  if (!session.ok) {
    return { data: EMPTY_ALERTS, error: session.error };
  }

  const searchParams = buildAlertsListSearchParams(options);
  const result = await fetchAuthenticatedUpstreamJson({
    path: `/alerts?${searchParams.toString()}`,
    schema: alertsResponseSchema,
    httpErrorMessage: "Não foi possível carregar os alertas.",
  });

  if (!result.ok) {
    return { data: EMPTY_ALERTS, error: result.error };
  }

  return { data: result.data, error: null };
}

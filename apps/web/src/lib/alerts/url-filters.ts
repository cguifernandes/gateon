import type { DateRangeValue } from "@/components/filters-popever";
import {
  formatUrlDateParam,
  parseUrlDateParam,
  setUrlDateRangeParams,
} from "@/lib/filters/date-params";
import type {
  AlertDestinationType,
  AlertStatus,
} from "@/lib/zod/alert-schemas";

export type AlertsUrlFiltersState = {
  status: AlertStatus | "all";
  destination: AlertDestinationType | "all";
  groupId: string | "all";
  createdRange: DateRangeValue;
};

const VALID_STATUS = new Set<AlertsUrlFiltersState["status"]>([
  "all",
  "ACTIVE",
  "DRAFT",
  "PAUSED",
  "FAILED",
]);

const VALID_DESTINATION = new Set<AlertsUrlFiltersState["destination"]>([
  "all",
  "GROUP",
  "TOPIC",
  "MEMBERS",
  "QUICK_ALERT",
  "AUTOMATION",
]);

export function parseAlertsUrlFiltersFromSearchParams(
  params: Pick<URLSearchParams, "get">,
): AlertsUrlFiltersState {
  const statusParam = params.get("status") ?? "all";
  const status: AlertsUrlFiltersState["status"] = VALID_STATUS.has(
    statusParam as AlertsUrlFiltersState["status"],
  )
    ? (statusParam as AlertsUrlFiltersState["status"])
    : "all";

  const destinationParam = params.get("destination") ?? "all";
  const destination: AlertsUrlFiltersState["destination"] =
    VALID_DESTINATION.has(
      destinationParam as AlertsUrlFiltersState["destination"],
    )
      ? (destinationParam as AlertsUrlFiltersState["destination"])
      : "all";

  const groupParam = (params.get("groupId") ?? "all").trim();
  const groupId =
    groupParam.length > 0 && groupParam !== "all" ? groupParam : "all";

  const from = parseUrlDateParam(params.get("createdFrom"));
  const to = parseUrlDateParam(params.get("createdTo"));
  const createdRange: DateRangeValue = from ? { from, to } : undefined;

  return {
    status,
    destination,
    groupId,
    createdRange,
  };
}

export function buildAlertsUrlFiltersSearchParams(
  filters: AlertsUrlFiltersState,
  base?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(base?.toString() ?? "");

  if (filters.status !== "all") {
    params.set("status", filters.status);
  } else {
    params.delete("status");
  }

  if (filters.destination !== "all") {
    params.set("destination", filters.destination);
  } else {
    params.delete("destination");
  }

  if (filters.groupId !== "all") {
    params.set("groupId", filters.groupId);
  } else {
    params.delete("groupId");
  }

  setUrlDateRangeParams(
    params,
    "createdFrom",
    "createdTo",
    filters.createdRange,
  );

  return params;
}

// Backward-compatible aliases used in query builders
export const formatAlertsFilterDate = formatUrlDateParam;

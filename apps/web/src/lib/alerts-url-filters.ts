import type { DateRangeValue } from "@/components/filters-popever";
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

const DATE_PARAM_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined;

  const match = DATE_PARAM_RE.exec(value);
  if (!match) return undefined;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatAlertsFilterDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

  const from = parseDateParam(params.get("createdFrom"));
  const to = parseDateParam(params.get("createdTo"));
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

  if (filters.createdRange?.from) {
    params.set(
      "createdFrom",
      formatAlertsFilterDate(filters.createdRange.from),
    );
    if (filters.createdRange.to) {
      params.set("createdTo", formatAlertsFilterDate(filters.createdRange.to));
    } else {
      params.delete("createdTo");
    }
  } else {
    params.delete("createdFrom");
    params.delete("createdTo");
  }

  return params;
}

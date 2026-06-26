import type { DateRangeValue } from "@/components/filters-popever";
import {
  parseUrlDateParam,
  setUrlDateRangeParams,
} from "@/lib/filters/date-params";
import {
  BOT_STATUS_FILTER_OPTIONS,
  type BotStatusFilterValue,
} from "@/lib/telegram/bot-status";

/** Filters persisted in the URL (popover only — search stays in client state). */
export type GroupsUrlFiltersState = {
  botStatus: BotStatusFilterValue;
  connectedRange: DateRangeValue;
  stripeConnectionIds: string[];
};

const VALID_BOT_STATUS = new Set<BotStatusFilterValue>(
  BOT_STATUS_FILTER_OPTIONS.map((option) => option.value),
);

export function parseGroupsUrlFiltersFromSearchParams(
  params: Pick<URLSearchParams, "get" | "getAll">,
): GroupsUrlFiltersState {
  const statusParam = params.get("status") ?? "all";
  const botStatus: BotStatusFilterValue = VALID_BOT_STATUS.has(
    statusParam as BotStatusFilterValue,
  )
    ? (statusParam as BotStatusFilterValue)
    : "all";

  const from = parseUrlDateParam(params.get("from"));
  const to = parseUrlDateParam(params.get("to"));
  const connectedRange: DateRangeValue =
    from !== undefined ? { from, to } : undefined;

  const stripeConnectionIds = params
    .getAll("connectionId")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  return {
    botStatus,
    connectedRange,
    stripeConnectionIds,
  };
}

export function buildGroupsUrlFiltersSearchParams(
  filters: GroupsUrlFiltersState,
  base?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(base?.toString() ?? "");

  params.delete("q");

  if (filters.botStatus !== "all") {
    params.set("status", filters.botStatus);
  } else {
    params.delete("status");
  }

  setUrlDateRangeParams(params, "from", "to", filters.connectedRange);

  params.delete("connectionId");
  for (const connectionId of filters.stripeConnectionIds) {
    const normalized = connectionId.trim();
    if (normalized.length > 0) {
      params.append("connectionId", normalized);
    }
  }

  return params;
}

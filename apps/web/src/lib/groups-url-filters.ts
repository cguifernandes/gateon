import type { DateRangeValue } from "@/components/filters-popever";
import {
  BOT_STATUS_FILTER_OPTIONS,
  type BotStatusFilterValue,
} from "@/lib/telegram-bot-status";

/** Filters persisted in the URL (popover only — search stays in client state). */
export type GroupsUrlFiltersState = {
  botStatus: BotStatusFilterValue;
  connectedRange: DateRangeValue;
};

const VALID_BOT_STATUS = new Set<BotStatusFilterValue>(
  BOT_STATUS_FILTER_OPTIONS.map((option) => option.value),
);

const DATE_PARAM_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateParam(value: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const match = DATE_PARAM_RE.exec(value);
  if (!match) {
    return undefined;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatGroupsFilterDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseGroupsUrlFiltersFromSearchParams(
  params: Pick<URLSearchParams, "get">,
): GroupsUrlFiltersState {
  const statusParam = params.get("status") ?? "all";
  const botStatus: BotStatusFilterValue = VALID_BOT_STATUS.has(
    statusParam as BotStatusFilterValue,
  )
    ? (statusParam as BotStatusFilterValue)
    : "all";

  const from = parseDateParam(params.get("from"));
  const to = parseDateParam(params.get("to"));
  const connectedRange: DateRangeValue =
    from !== undefined ? { from, to } : undefined;

  return {
    botStatus,
    connectedRange,
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

  if (filters.connectedRange?.from) {
    params.set("from", formatGroupsFilterDate(filters.connectedRange.from));
    if (filters.connectedRange.to) {
      params.set("to", formatGroupsFilterDate(filters.connectedRange.to));
    } else {
      params.delete("to");
    }
  } else {
    params.delete("from");
    params.delete("to");
  }

  return params;
}

"use client";

import { useMemo } from "react";
import {
  type DateRangeValue,
  type FilterParam,
  FiltersPopover,
} from "@/components/filters-popever";
import {
  BOT_STATUS_FILTER_OPTIONS,
  type BotStatusFilterValue,
} from "@/lib/telegram-bot-status";

type GroupsFiltersPopoverProps = {
  botStatus: BotStatusFilterValue;
  onBotStatusChange: (value: BotStatusFilterValue) => void;
  connectedRange: DateRangeValue;
  onConnectedRangeChange: (value: DateRangeValue) => void;
  onClearFilters: () => void;
};

export function GroupsFiltersPopover({
  botStatus,
  onBotStatusChange,
  connectedRange,
  onConnectedRangeChange,
  onClearFilters,
}: GroupsFiltersPopoverProps) {
  const filters = useMemo<FilterParam[]>(
    () => [
      {
        type: "select",
        field: "botStatus",
        label: "Status",
        value: botStatus,
        emptyValue: "all",
        options: BOT_STATUS_FILTER_OPTIONS,
        onChange: (value) => onBotStatusChange(value as BotStatusFilterValue),
      },
      {
        type: "date",
        field: "connectedAt",
        label: "Conectado entre",
        range: true,
        value: connectedRange,
        onChange: onConnectedRangeChange,
      },
    ],
    [botStatus, connectedRange, onBotStatusChange, onConnectedRangeChange],
  );

  return (
    <FiltersPopover
      title="Filtros avançados de grupos"
      filters={filters}
      onClearFilters={onClearFilters}
    />
  );
}

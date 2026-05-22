"use client";

import { useMemo } from "react";
import { type FilterParam, FiltersPopover } from "@/components/filters-popever";
import {
  BOT_STATUS_FILTER_OPTIONS,
  type BotStatusFilterValue,
} from "@/lib/telegram-bot-status";
import type { GroupsFiltersPopoverControl } from "../_hooks/use-groups-filters-url";

type GroupsFiltersPopoverProps = {
  control: GroupsFiltersPopoverControl;
};

export function GroupsFiltersPopover({ control }: GroupsFiltersPopoverProps) {
  const { draft } = control;

  const filters = useMemo<FilterParam[]>(
    () => [
      {
        type: "select",
        field: "botStatus",
        label: "Status",
        value: draft.botStatus,
        emptyValue: "all",
        options: BOT_STATUS_FILTER_OPTIONS,
        onChange: (value) => control.setBotStatus(value as BotStatusFilterValue),
      },
      {
        type: "date",
        field: "connectedAt",
        label: "Conectado entre",
        range: true,
        value: draft.connectedRange,
        onChange: control.setConnectedRange,
      },
    ],
    [draft, control],
  );

  return (
    <FiltersPopover
      title="Filtros avançados de grupos"
      filters={filters}
      appliedActiveFilterCount={control.appliedActiveCount}
      hasPendingChanges={control.hasPendingChanges}
      onApplyFilters={control.apply}
      onClearFilters={control.clear}
      onPopoverOpenChange={(open) => {
        if (open) {
          control.syncDraftFromUrl();
        }
      }}
    />
  );
}

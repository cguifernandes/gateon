"use client";

import { useMemo } from "react";
import { type FilterParam, FiltersPopover } from "@/components/filters-popever";
import {
  StripePlanFilterOptions,
  toStripePlanFilterOptions,
} from "@/components/stripe-plan-filter-options";
import {
  BOT_STATUS_FILTER_OPTIONS,
  type BotStatusFilterValue,
} from "@/lib/telegram-bot-status";
import type { StripeBillingConnectionDto } from "@/lib/zod/stripe-billing-schemas";
import type { GroupsFiltersPopoverControl } from "../_hooks/use-groups-filters-url";

type GroupsFiltersPopoverProps = {
  stripeConnections: StripeBillingConnectionDto[];
  control: GroupsFiltersPopoverControl;
};

export function GroupsFiltersPopover({
  stripeConnections,
  control,
}: GroupsFiltersPopoverProps) {
  const { draft } = control;
  const stripePlans = useMemo(
    () => toStripePlanFilterOptions(stripeConnections),
    [stripeConnections],
  );

  const filters = useMemo<FilterParam[]>(
    () => [
      {
        type: "select",
        field: "botStatus",
        label: "Status",
        value: draft.botStatus,
        emptyValue: "all",
        options: BOT_STATUS_FILTER_OPTIONS,
        onChange: (value) =>
          control.setBotStatus(value as BotStatusFilterValue),
      },
      {
        type: "custom",
        field: "stripePlan",
        label: "Plano Stripe",
        isActive: draft.stripeConnectionIds.length > 0,
        render: (
          <StripePlanFilterOptions
            plans={stripePlans}
            value={draft.stripeConnectionIds}
            onChange={control.setStripeConnectionIds}
            placeholder="Selecionar planos"
            emptyMessage="Nenhum plano Stripe conectado."
          />
        ),
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
    [control, draft, stripePlans],
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

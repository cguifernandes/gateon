"use client";

import { useMemo } from "react";
import { XIcon } from "@/components/icons/x";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { getStripePlanLabel } from "@/lib/stripe/plan-label";
import { cn } from "@/lib/utils";

const VISIBLE_CHIP_LIMIT = 2;

export type StripePlanFilterOption = {
  connectionId: string;
  label: string;
};

type StripePlanComboboxItem = {
  value: string;
  label: string;
};

type StripePlanFilterOptionsProps = {
  plans: StripePlanFilterOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
};

function normalizeSelectedIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

function toComboboxItems(
  plans: StripePlanFilterOption[],
): StripePlanComboboxItem[] {
  return plans.map((plan) => ({
    value: plan.connectionId,
    label: plan.label,
  }));
}

export function toStripePlanFilterOptions<
  T extends {
    id: string;
    monitoredPlanLabel?: string | null;
    monitoredStripePriceId?: string | null;
  },
>(connections: T[]): StripePlanFilterOption[] {
  return connections.map((connection) => ({
    connectionId: connection.id,
    label: getStripePlanLabel(connection),
  }));
}

export function StripePlanFilterOptions({
  plans,
  value,
  onChange,
  placeholder = "Selecionar planos",
  emptyMessage = "Nenhum plano encontrado.",
}: StripePlanFilterOptionsProps) {
  const anchor = useComboboxAnchor();
  const selectedIds = useMemo(() => normalizeSelectedIds(value), [value]);
  const hasPlanFilter = selectedIds.length > 0;
  const planItems = useMemo(() => toComboboxItems(plans), [plans]);

  const selectedItems = useMemo(
    () => planItems.filter((item) => selectedIds.includes(item.value)),
    [planItems, selectedIds],
  );

  return (
    <div className="flex items-center gap-2">
      <Combobox
        multiple
        items={planItems}
        value={selectedItems}
        onValueChange={(next) => {
          const nextItems = (next ?? []) as StripePlanComboboxItem[];
          onChange(nextItems.map((item) => item.value));
        }}
        isItemEqualToValue={(item, selected) => item.value === selected.value}
        itemToStringLabel={(item) => item.label}
      >
        <div
          ref={anchor}
          className={cn("min-w-0 w-full flex-1", hasPlanFilter && "min-h-9")}
        >
          <ComboboxChips className="h-auto min-h-9 w-full py-1.5">
            <ComboboxValue>
              {(selected: StripePlanComboboxItem[] | null) => {
                const items = selected ?? [];
                const visibleItems = items.slice(0, VISIBLE_CHIP_LIMIT);
                const hiddenCount = items.length - visibleItems.length;

                return (
                  <>
                    {visibleItems.map((item) => (
                      <ComboboxChip key={item.value}>{item.label}</ComboboxChip>
                    ))}
                    {hiddenCount > 0 ? (
                      <span className="px-1 text-muted-foreground text-xs">
                        +{hiddenCount}
                      </span>
                    ) : null}
                    <ComboboxChipsInput
                      placeholder={items.length > 0 ? "" : placeholder}
                      className="min-w-12"
                    />
                  </>
                );
              }}
            </ComboboxValue>
          </ComboboxChips>
        </div>

        <ComboboxContent
          anchor={anchor}
          align="start"
          className="z-60 w-[min(100vw-2rem,20rem)]"
        >
          <ComboboxList>
            {(item: StripePlanComboboxItem) => (
              <ComboboxItem key={item.value} value={item} className="py-2">
                <span className="truncate font-medium">{item.label}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>

      {hasPlanFilter ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-9 shrink-0"
          aria-label="Remover filtro de planos"
          onClick={() => onChange([])}
        >
          <XIcon size={14} aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

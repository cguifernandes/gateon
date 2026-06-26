"use client";

import { ptBR } from "date-fns/locale";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { SearchIcon, type SearchIconHandle } from "@/components/icons/search";
import {
  SlidersHorizontalIcon,
  type SlidersHorizontalIconHandle,
} from "@/components/icons/sliders-horizontal";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface TextFilterParam {
  type: "text";
  field: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export type DateRangeValue =
  | { from: Date | undefined; to?: Date | undefined }
  | undefined;

export interface DateFilterParamSingle {
  type: "date";
  field: string;
  label: string;
  range?: false;
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
}

export interface DateFilterParamRange {
  type: "date";
  field: string;
  label: string;
  range: true;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

export type DateFilterParam = DateFilterParamSingle | DateFilterParamRange;

export interface SelectFilterOption {
  value: string;
  label: string;
}

export interface SelectFilterParam {
  type: "select";
  field: string;
  label: string;
  value: string;
  options: SelectFilterOption[];
  emptyValue?: string;
  onChange: (value: string) => void;
}

export interface CustomFilterParam {
  type: "custom";
  field: string;
  label: string;
  isActive?: boolean;
  render: ReactNode;
}

export type FilterParam =
  | TextFilterParam
  | DateFilterParam
  | SelectFilterParam
  | CustomFilterParam;

interface FiltersPopoverProps {
  filters: FilterParam[];
  appliedActiveFilterCount: number;
  hasPendingChanges: boolean;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  onPopoverOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function FiltersPopover({
  filters,
  appliedActiveFilterCount,
  hasPendingChanges,
  onApplyFilters,
  onClearFilters,
  onPopoverOpenChange,
  title = "Filtros",
  description,
}: FiltersPopoverProps) {
  const refIconFilters = useRef<SlidersHorizontalIconHandle>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const hasAppliedFilters = appliedActiveFilterCount > 0;
  const tooltipLabel = hasAppliedFilters
    ? `${appliedActiveFilterCount} filtro${appliedActiveFilterCount === 1 ? "" : "s"} ativo${appliedActiveFilterCount === 1 ? "" : "s"}`
    : "Abrir filtros";

  function handleOpenChange(open: boolean) {
    setPopoverOpen(open);
    onPopoverOpenChange?.(open);
  }

  function handleApplyFilters() {
    onApplyFilters();
    setPopoverOpen(false);
  }

  function handleClearFilters() {
    onClearFilters();
    setPopoverOpen(false);
  }

  return (
    <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
      <Tooltip disabled={popoverOpen}>
        <PopoverTrigger
          render={(popoverProps) => (
            <TooltipTrigger
              render={(tooltipProps) => (
                <Button
                  {...popoverProps}
                  {...tooltipProps}
                  variant={hasAppliedFilters ? "default" : "outline"}
                  className={cn(
                    "relative size-[40px] shrink-0 overflow-visible",
                    popoverProps.className,
                    tooltipProps.className,
                  )}
                  aria-label={tooltipLabel}
                  onMouseEnter={(event) => {
                    popoverProps.onMouseEnter?.(event);
                    tooltipProps.onMouseEnter?.(event);
                    refIconFilters.current?.startAnimation();
                  }}
                  onMouseLeave={(event) => {
                    popoverProps.onMouseLeave?.(event);
                    tooltipProps.onMouseLeave?.(event);
                    refIconFilters.current?.stopAnimation();
                  }}
                  onClick={(event) => {
                    popoverProps.onClick?.(event);
                    tooltipProps.onClick?.(event);
                  }}
                >
                  <SlidersHorizontalIcon ref={refIconFilters} />
                  {hasAppliedFilters ? (
                    <span
                      aria-hidden
                      className="absolute -top-1.5 -right-1.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground px-0.5 text-[10px] leading-none font-semibold text-primary tabular-nums shadow-sm ring-1 ring-primary"
                    >
                      {appliedActiveFilterCount > 9
                        ? "9+"
                        : appliedActiveFilterCount}
                    </span>
                  ) : null}
                </Button>
              )}
            />
          )}
        />
        <TooltipContent sideOffset={8} side="bottom">
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        className={cn("w-80 max-h-[440px] overflow-y-auto p-0")}
      >
        <div className="p-3 flex flex-col gap-3">
          <PopoverHeader>
            <PopoverTitle>{title}</PopoverTitle>
            {description && (
              <PopoverDescription>{description}</PopoverDescription>
            )}
          </PopoverHeader>

          {filters.map((filter) => (
            <div key={filter.field} className="space-y-2">
              {filter.type === "text" ? (
                <>
                  <Label htmlFor={`filter-${filter.field}`}>
                    {filter.label}
                  </Label>
                  <div className="relative group">
                    <SearchIcon
                      className="absolute left-3 z-10 top-1/2 -translate-y-1/2 group-focus-within:-translate-y-[calc(50%+2px)] text-muted-foreground transition-transform duration-150"
                      size={16}
                      aria-hidden
                    />
                    <Input
                      id={`filter-${filter.field}`}
                      placeholder={
                        filter.placeholder ??
                        `Buscar por ${filter.label.toLowerCase()}...`
                      }
                      value={filter.value}
                      onChange={(e) => filter.onChange(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </>
              ) : filter.type === "select" ? (
                <>
                  <Label>{filter.label}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {filter.options.map((option) => (
                      <Button
                        key={option.value}
                        variant={
                          filter.value === option.value ? "default" : "outline"
                        }
                        size="sm"
                        className="text-xs font-medium transition-colors"
                        onClick={() => filter.onChange(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </>
              ) : filter.type === "date" && filter.range ? (
                <>
                  <Label htmlFor={`filter-${filter.field}`}>
                    {filter.label}
                  </Label>
                  <Calendar
                    mode="range"
                    selected={filter.value}
                    onSelect={(range) => filter.onChange(range)}
                    locale={ptBR}
                    captionLayout="dropdown"
                    startMonth={new Date(2010, 0)}
                    endMonth={new Date()}
                    classNames={{
                      root: "rounded-lg border border-border",
                    }}
                  />
                </>
              ) : filter.type === "date" ? (
                <>
                  <Label htmlFor={`filter-${filter.field}`}>
                    {filter.label}
                  </Label>
                  <Calendar
                    mode="single"
                    selected={filter.value}
                    onSelect={(date) => filter.onChange(date)}
                    locale={ptBR}
                    captionLayout="dropdown"
                    startMonth={new Date(2010, 0)}
                    endMonth={new Date()}
                    classNames={{
                      root: "rounded-lg border border-border",
                    }}
                  />
                </>
              ) : filter.type === "custom" ? (
                <>
                  <Label>{filter.label}</Label>
                  {filter.render}
                </>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-auto flex w-full shrink-0 gap-2 border-t border-border px-3 py-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleClearFilters}
          >
            Limpar
          </Button>
          <Button
            type="button"
            variant="default"
            className="flex-1"
            disabled={!hasPendingChanges}
            onClick={handleApplyFilters}
          >
            Aplicar filtros
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

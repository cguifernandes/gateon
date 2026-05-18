"use client";

import { ptBR } from "date-fns/locale";
import { Search } from "lucide-react";
import { useRef } from "react";
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

export type FilterParam = TextFilterParam | DateFilterParam | SelectFilterParam;

function isFilterActive(filter: FilterParam): boolean {
  if (filter.type === "text") return filter.value.length > 0;
  if (filter.type === "select") {
    const empty = filter.emptyValue ?? "all";
    return filter.value !== empty;
  }
  if (filter.type === "date" && filter.range) {
    return filter.value?.from !== undefined;
  }
  if (filter.type === "date") return filter.value !== undefined;
  return false;
}

interface FiltersPopoverProps {
  filters: FilterParam[];
  onClearFilters: () => void;
  title?: string;
  description?: string;
}

export function FiltersPopover({
  filters,
  onClearFilters,
  title = "Filtros",
  description,
}: FiltersPopoverProps) {
  const refIconFilters = useRef<SlidersHorizontalIconHandle>(null);

  const activeFilterCount = filters.filter(isFilterActive).length;
  const hasFilters = activeFilterCount > 0;

  return (
    <Popover>
      <PopoverTrigger
        render={(props) => (
          <Button
            {...props}
            variant={hasFilters ? "default" : "outline"}
            className={cn("relative size-[38px] shrink-0 overflow-visible")}
            aria-label={
              hasFilters
                ? `Filtros (${activeFilterCount} ativo${activeFilterCount === 1 ? "" : "s"})`
                : "Abrir filtros"
            }
            onMouseEnter={() => refIconFilters.current?.startAnimation()}
            onMouseLeave={() => refIconFilters.current?.stopAnimation()}
          >
            <SlidersHorizontalIcon ref={refIconFilters} size={18} />
            {hasFilters ? (
              <span
                aria-hidden
                className="absolute -top-1.5 -right-1.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground px-0.5 text-[10px] leading-none font-semibold text-primary tabular-nums shadow-sm ring-1 ring-primary"
              >
                {activeFilterCount > 9 ? "9+" : activeFilterCount}
              </span>
            ) : null}
          </Button>
        )}
      />
      <PopoverContent align="end" className={cn("w-80 p-0")}>
        <div className="p-2 flex flex-col gap-3">
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
                    <Search className="absolute left-3 z-10 top-1/2 -translate-y-1/2 group-focus-within:-translate-y-[calc(50%+2px)] size-4 text-muted-foreground transition-transform duration-150" />
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
                      root: "rounded-lg border-2 border-border",
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
                      root: "rounded-lg border-2 border-border",
                    }}
                  />
                </>
              ) : null}
            </div>
          ))}
        </div>

        {hasFilters && (
          <div className="items-center space-x-2 px-6 py-4 mt-auto border-t border-border flex w-full shrink-0 justify-between">
            <Button
              variant="default"
              className="w-full"
              onClick={onClearFilters}
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

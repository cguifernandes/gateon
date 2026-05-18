"use client";

import { ChevronDownIcon } from "lucide-react";
import * as React from "react";
import {
  type DayButton,
  DayPicker,
  type DropdownProps,
  getDefaultClassNames,
  isDateRange,
  type Locale,
  UI,
  useDayPicker,
} from "react-day-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ChevronLeftIconHandle } from "../icons/chevron-left";
import { ChevronLeftIcon } from "../icons/chevron-left";
import { ChevronRightIcon } from "../icons/chevron-right";

/** Imperative API matches both nav chevrons (path animation). */
type NavMonthChevronHandle = ChevronLeftIconHandle;

type CalendarChevronPickerProps = {
  className?: string;
  orientation?: "up" | "down" | "left" | "right";
  disabled?: boolean;
  style?: React.CSSProperties;
};

const CalendarChevron = React.forwardRef<
  NavMonthChevronHandle | null,
  CalendarChevronPickerProps
>(function CalendarChevron(
  { className, orientation, style, disabled: _disabled },
  ref,
) {
  if (orientation === "left") {
    return (
      <ChevronLeftIcon
        ref={ref}
        size={16}
        animateOnHover={false}
        isAnimateOnView={false}
        className={cn("cn-rtl-flip", className)}
        style={style}
      />
    );
  }

  if (orientation === "right") {
    return (
      <ChevronRightIcon
        ref={ref}
        size={16}
        animateOnHover={false}
        isAnimateOnView={false}
        className={cn("cn-rtl-flip", className)}
        style={style}
      />
    );
  }

  void ref;
  return (
    <ChevronDownIcon
      className={cn("size-3.5 opacity-80", className)}
      style={style}
    />
  );
});
CalendarChevron.displayName = "CalendarChevron";

function injectNavChevronRef(
  children: React.ReactNode,
  iconRef: React.RefObject<NavMonthChevronHandle | null>,
) {
  const only = React.Children.only(children);
  if (!React.isValidElement(only)) return children;
  return React.cloneElement(
    only as React.ReactElement<{ ref?: React.Ref<NavMonthChevronHandle> }>,
    { ref: iconRef } as never,
  );
}

function CalendarPreviousMonthButton({
  children,
  onMouseEnter,
  onMouseLeave,
  ...props
}: React.ComponentProps<"button">) {
  const iconRef = React.useRef<NavMonthChevronHandle | null>(null);

  return (
    <button
      {...props}
      onMouseEnter={(e) => {
        iconRef.current?.startAnimation();
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        iconRef.current?.stopAnimation();
        onMouseLeave?.(e);
      }}
    >
      {injectNavChevronRef(children, iconRef)}
    </button>
  );
}

function CalendarNextMonthButton({
  children,
  onMouseEnter,
  onMouseLeave,
  ...props
}: React.ComponentProps<"button">) {
  const iconRef = React.useRef<NavMonthChevronHandle | null>(null);

  return (
    <button
      {...props}
      onMouseEnter={(e) => {
        iconRef.current?.startAnimation();
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        iconRef.current?.stopAnimation();
        onMouseLeave?.(e);
      }}
    >
      {injectNavChevronRef(children, iconRef)}
    </button>
  );
}

function CalendarDropdown({
  options,
  className,
  ...selectProps
}: DropdownProps) {
  const { classNames, styles } = useDayPicker();

  const strValue =
    selectProps.value === undefined || selectProps.value === null
      ? ""
      : String(selectProps.value);

  const emitChange = (next: string) => {
    const synthetic = {
      target: { value: next },
      currentTarget: { value: next },
    } as React.ChangeEvent<HTMLSelectElement>;
    selectProps.onChange?.(synthetic);
  };

  return (
    <span
      data-disabled={selectProps.disabled}
      className={cn(classNames[UI.DropdownRoot], "w-20")}
      style={styles?.[UI.DropdownRoot]}
    >
      <Select
        value={strValue}
        onValueChange={emitChange}
        disabled={Boolean(selectProps.disabled)}
        name={selectProps.name}
        required={selectProps.required}
        form={selectProps.form}
        autoComplete={selectProps.autoComplete}
      >
        <SelectTrigger
          id={selectProps.id}
          aria-label={selectProps["aria-label"]}
          size="sm"
          className={cn(
            "h-(--cell-size) min-h-(--cell-size) w-full min-w-13 border-border bg-background px-2 font-medium shadow-none",
            classNames[UI.Dropdown],
            className,
          )}
          style={{ ...styles?.[UI.Dropdown], ...selectProps.style }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={4}
          className="z-100 max-h-60"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {options?.map((opt) => (
            <SelectItem
              key={opt.value}
              value={String(opt.value)}
              disabled={opt.disabled}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  cellSize = "2rem",
  style,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  cellSize?: string;
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar rounded-xl border border-border bg-card p-3 shadow-xs [--cell-radius:0.5rem] in-data-[slot=card-content]:border-0 in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:shadow-none",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      style={
        {
          ...style,
          "--cell-size": cellSize,
        } as React.CSSProperties
      }
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-full min-w-0 sm:w-fit", defaultClassNames.root),
        months: cn(
          "relative flex w-full flex-col gap-4 md:flex-row",
          defaultClassNames.months,
        ),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 px-0.5",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-(--cell-size) shrink-0 rounded-lg shadow-none select-none aria-disabled:opacity-40",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-(--cell-size) shrink-0 rounded-lg shadow-none select-none aria-disabled:opacity-40",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-2",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-2 text-sm font-medium text-foreground",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative inline-flex rounded-(--cell-radius) outline-none focus-within:ring-2 focus-within:ring-primary/35",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(defaultClassNames.dropdown),
        caption_label: cn(
          "font-medium text-foreground select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        weekdays: cn(
          "border-b border-border/50 pb-2",
          defaultClassNames.weekdays,
        ),
        weekday: cn(
          "text-center text-[0.7rem] font-medium text-muted-foreground uppercase pr-1.5! tracking-wide select-none",
          defaultClassNames.weekday,
        ),
        month_grid: cn(
          "w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-2",
          defaultClassNames.month_grid,
        ),
        week: cn("mt-0", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "text-[0.65rem] text-muted-foreground select-none",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative text-center align-middle text-sm select-none",
          defaultClassNames.day,
        ),
        /** Track on `<td>` so the range reads as one bar; padding gaps only outside the band. */
        range_start: cn(
          "overflow-hidden rounded-l-(--cell-radius) bg-primary w-8.5",
          defaultClassNames.range_start,
        ),
        range_middle: cn(
          "overflow-hidden bg-primary px-0",
          defaultClassNames.range_middle,
        ),
        range_end: cn(
          "overflow-hidden rounded-r-(--cell-radius) bg-primary flex max-w-8.5",
          defaultClassNames.range_end,
        ),
        today: cn(
          "rounded-(--cell-radius) font-medium",
          "data-[selected=false]:bg-transparent data-[selected=false]:ring-1 data-[selected=false]:ring-primary/40 data-[selected=false]:ring-inset",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-muted-foreground/45 opacity-90 aria-selected:text-white/90",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground opacity-35",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...rootProps }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...rootProps}
            />
          );
        },
        PreviousMonthButton: CalendarPreviousMonthButton,
        NextMonthButton: CalendarNextMonthButton,
        // biome-ignore lint/suspicious/noExplicitAny: `DayPicker` types `Chevron` as a plain FC; we need `forwardRef` for `cloneElement` ref on nav buttons.
        Chevron: CalendarChevron as any,
        Dropdown: CalendarDropdown,
        DayButton: ({ ...dayBtnProps }) => (
          <CalendarDayButton locale={locale} {...dayBtnProps} />
        ),
        WeekNumber: ({ children, ...weekProps }) => {
          return (
            <td {...weekProps}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isOutside = modifiers.outside;

  const inRangeBand = Boolean(
    modifiers.range_start || modifiers.range_middle || modifiers.range_end,
  );

  const { dayPickerProps, selected: rawSelected } = useDayPicker();
  const selectedRangeCandidate: unknown = rawSelected;
  const isRangePicking =
    dayPickerProps.mode === "range" &&
    isDateRange(selectedRangeCandidate) &&
    Boolean(selectedRangeCandidate.from && !selectedRangeCandidate.to);
  const isRangePickingAnchor =
    isRangePicking &&
    modifiers.selected &&
    !modifiers.range_start &&
    !modifiers.range_end &&
    !modifiers.range_middle;

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-range-picking-anchor={isRangePickingAnchor}
      className={cn(
        "relative isolate z-10 max-w-8.5 max-h-8.5 flex aspect-square w-full min-w-(--cell-size) flex-col gap-0 border-0 p-0 text-xs leading-none font-normal transition-colors",
        "text-foreground",
        inRangeBand && !isRangePickingAnchor
          ? "rounded-none bg-transparent text-primary-foreground shadow-none hover:bg-black/10 dark:hover:bg-white/15"
          : !isRangePickingAnchor && "hover:bg-muted/50",
        isOutside && "text-muted-foreground/50",
        isRangePickingAnchor &&
          "rounded-(--cell-radius) bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground",
        !isRangePickingAnchor &&
          !inRangeBand && [
            "data-[selected-single=true]:shadow-sm",
            "data-[selected-single=true]:rounded-(--cell-radius)",
            "data-[selected-single=true]:text-primary-foreground",
            "data-[selected-single=true]:bg-primary",
            "data-[selected-single=true]:hover:bg-primary/90",
          ],
        "[&>span]:text-[0.7rem] [&>span]:opacity-80 [&>span]:data-[selected-single=true]:opacity-95 [&>span]:data-[range-end=true]:opacity-95 [&>span]:data-[range-middle=true]:opacity-95 [&>span]:data-[range-start=true]:opacity-95 [&>span]:data-[range-picking-anchor=true]:opacity-95",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };

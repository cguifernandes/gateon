"use client";

import * as React from "react";
import {
  type ChevronProps,
  type DayButton,
  DayPicker,
  type DropdownProps,
  getDefaultClassNames,
  type Locale,
  useDayPicker,
} from "react-day-picker";
import {
  ChevronLeftIcon,
  type ChevronLeftIconHandle,
} from "@/components/icons/chevron-left";
import {
  ChevronRightIcon,
  type ChevronRightIconHandle,
} from "@/components/icons/chevron-right";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IconAnimationHandle } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "../icons/chevron-down";

type NavMonthChevronHandle = IconAnimationHandle;

type CalendarChevronPickerProps = {
  className?: string;
  orientation?: "up" | "down" | "left" | "right";
  disabled?: boolean;
  size?: number;
  style?: React.CSSProperties;
};

const CalendarChevron = React.forwardRef<
  NavMonthChevronHandle,
  CalendarChevronPickerProps
>(function CalendarChevron(
  { className, orientation, style, disabled, size = 16 },
  ref,
) {
  const iconClassName = cn(
    "cn-rtl-flip text-foreground",
    disabled && "opacity-50",
    className,
  );

  if (orientation === "left") {
    return (
      <ChevronLeftIcon
        ref={ref as React.Ref<ChevronLeftIconHandle>}
        size={size}
        animateOnHover={false}
        isAnimateOnView={false}
        className={iconClassName}
        style={style}
      />
    );
  }

  if (orientation === "right") {
    return (
      <ChevronRightIcon
        ref={ref as React.Ref<ChevronRightIconHandle>}
        size={size}
        animateOnHover={false}
        isAnimateOnView={false}
        className={iconClassName}
        style={style}
      />
    );
  }

  return (
    <ChevronDownIcon
      size={size}
      animateOnHover={false}
      isAnimateOnView={false}
      className={cn("text-muted-foreground opacity-80", className)}
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

function CalendarDropdown({
  options,
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const { classNames } = useDayPicker();
  const selectedValue = value === undefined ? undefined : String(value);

  return (
    <span
      data-disabled={disabled || undefined}
      className={classNames.dropdown_root}
    >
      <Select
        value={selectedValue}
        onValueChange={(newValue) => {
          onChange?.({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLSelectElement>);
        }}
        disabled={disabled}
      >
        <SelectTrigger
          size="sm"
          aria-label={ariaLabel}
          className={cn(
            "h-(--cell-size) w-auto min-w-16 px-2 shadow-none",
            className,
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="z-60 max-h-60">
          {options?.map((option) => (
            <SelectItem
              key={option.value}
              value={String(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}

function CalendarNavMonthButton({
  children,
  className,
  variant = "ghost",
  onMouseEnter,
  onMouseLeave,
  disabled,
  ...props
}: React.ComponentProps<typeof Button>) {
  const iconRef = React.useRef<NavMonthChevronHandle | null>(null);

  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      className={cn("size-(--cell-size) p-0", className)}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) iconRef.current?.startAnimation();
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!disabled) iconRef.current?.stopAnimation();
        onMouseLeave?.(e);
      }}
      {...props}
    >
      {injectNavChevronRef(children, iconRef)}
    </Button>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "outline",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-background overflow-y-auto p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months,
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          "select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          "select-none aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative shrink-0 rounded-(--cell-radius)",
          defaultClassNames.dropdown_root,
        ),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label" ? "cn-calendar-caption text-sm" : "text-sm",
          defaultClassNames.caption_label,
        ),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
          defaultClassNames.weekday,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)"
            : "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
          defaultClassNames.day,
        ),
        range_start: cn(
          "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
          defaultClassNames.range_start,
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
          defaultClassNames.range_end,
        ),
        today: cn(
          "rounded-(--cell-radius) bg-primary/10! text-primary! data-[selected=true]:rounded-none",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: CalendarChevron as (props: ChevronProps) => React.ReactElement,
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        PreviousMonthButton: (navProps) => (
          <CalendarNavMonthButton {...navProps} variant={buttonVariant} />
        ),
        NextMonthButton: (navProps) => (
          <CalendarNavMonthButton {...navProps} variant={buttonVariant} />
        ),
        Dropdown: CalendarDropdown,
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
  const isToday = Boolean(modifiers.today);
  const isSelected =
    Boolean(modifiers.selected) ||
    Boolean(modifiers.range_start) ||
    Boolean(modifiers.range_end) ||
    Boolean(modifiers.range_middle);
  const shouldHighlightToday = isToday && !isSelected;

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
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
      className={cn(
        "relative isolate z-10 flex bg-transparent text-muted-foreground aspect-square text-xs hover:bg-transparent! size-auto w-full min-w-(--cell-size) flex-col",
        "gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative",
        "data-[range-end=true]:rounded-(--cell-radius)",
        "data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:hover:bg-primary!",
        "data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted!",
        "data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-(--cell-radius)",
        "data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary",
        "data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[range-start=true]:hover:bg-primary!",
        "data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        shouldHighlightToday
          ? "bg-primary/10! text-primary! hover:bg-primary/10! dark:hover:bg-primary/10!"
          : undefined,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };

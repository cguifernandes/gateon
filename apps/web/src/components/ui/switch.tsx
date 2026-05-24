"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "value"
> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

function Switch({
  className,
  checked = false,
  disabled,
  onCheckedChange,
  onClick,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onCheckedChange?.(!checked);
        }
      }}
      {...props}
    >
      <span
        data-state={checked ? "checked" : "unchecked"}
        className="pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      />
    </button>
  );
}

export { Switch };

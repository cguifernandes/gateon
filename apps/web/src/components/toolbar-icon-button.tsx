"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ToolbarIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: "ghost" | "destructive";
  size?: "icon-xs" | "icon-sm";
  loading?: boolean;
  stopPointerPropagation?: boolean;
  children: ReactNode;
};

export function ToolbarIconButton({
  label,
  variant = "ghost",
  size = "icon-xs",
  loading = false,
  stopPointerPropagation = false,
  children,
  className,
  disabled,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  ...props
}: ToolbarIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps) => (
          <Button
            {...triggerProps}
            type="button"
            variant={variant}
            size={size}
            className={cn(triggerProps.className, className)}
            aria-label={label}
            loading={loading}
            disabled={disabled}
            onClick={(event) => {
              triggerProps.onClick?.(event);
              event.preventDefault();
              event.stopPropagation();
              onClick?.(event);
              event.currentTarget.blur();
            }}
            onMouseEnter={(event) => {
              onMouseEnter?.(event);
            }}
            onMouseLeave={(event) => {
              onMouseLeave?.(event);
            }}
            onPointerDown={(event) => {
              if (stopPointerPropagation) {
                event.stopPropagation();
              }
              onPointerDown?.(event);
            }}
            {...props}
          >
            {children}
          </Button>
        )}
      />
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

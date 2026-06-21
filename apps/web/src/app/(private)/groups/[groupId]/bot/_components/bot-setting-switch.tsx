"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import {
  BadgeAlertIcon,
  type BadgeAlertIconHandle,
} from "@/components/icons/badge-alert";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type BotSettingSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  description: string;
  tooltip: string;
  disabled?: boolean;
  children?: ReactNode;
};

export function BotSettingSwitch({
  checked,
  onCheckedChange,
  title,
  description,
  tooltip,
  disabled,
  children,
}: BotSettingSwitchProps) {
  const helpIconRef = useRef<BadgeAlertIconHandle>(null);

  return (
    <div className="rounded-xl border border-border bg-background/70">
      <div className="flex items-start justify-between gap-4 p-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{title}</p>
            <Tooltip>
              <TooltipTrigger
                render={(triggerProps) => (
                  <button
                    {...triggerProps}
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Ajuda sobre ${title}`}
                    onMouseEnter={(event) => {
                      triggerProps.onMouseEnter?.(event);
                      helpIconRef.current?.startAnimation();
                    }}
                    onMouseLeave={(event) => {
                      triggerProps.onMouseLeave?.(event);
                      helpIconRef.current?.stopAnimation();
                    }}
                  >
                    <BadgeAlertIcon
                      ref={helpIconRef}
                      size={14}
                      isAnimateOnView={false}
                      animateOnHover={false}
                    />
                  </button>
                )}
              />
              <TooltipContent side="top" sideOffset={8} className="max-w-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-muted-foreground text-sm font-light leading-snug">
            {description}
          </p>
        </div>
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          aria-label={title}
        />
      </div>
      {children ? (
        <div className="space-y-2 border-t border-border px-3 pb-3 pt-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  recommended?: boolean;
  disabled?: boolean;
};

export function BotSettingSwitch({
  checked,
  onCheckedChange,
  title,
  description,
  tooltip,
  recommended,
  disabled,
}: BotSettingSwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/70 p-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground text-sm">{title}</p>
          {recommended ? (
            <Badge variant="secondary" className="rounded-full text-[11px]">
              Recomendado
            </Badge>
          ) : null}
          <Tooltip>
            <TooltipTrigger
              render={(triggerProps) => (
                <button
                  {...triggerProps}
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Ajuda sobre ${title}`}
                >
                  <Info size={14} />
                </button>
              )}
            />
            <TooltipContent side="top" sideOffset={6}>
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-muted-foreground text-sm leading-snug">
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
  );
}

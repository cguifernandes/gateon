"use client";

import { useRef } from "react";
import {
  RefreshCWIcon,
  type RefreshCWIconHandle,
} from "@/components/icons/refresh-cw";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRefreshAllTelegramGroups } from "../_hooks/use-refresh-all-telegram-groups";

type RefreshAllGroupsButtonProps = {
  disabled?: boolean;
  onSynced?: () => void;
};

export function RefreshAllGroupsButton({
  disabled = false,
  onSynced,
}: RefreshAllGroupsButtonProps) {
  const refreshIconRef = useRef<RefreshCWIconHandle>(null);
  const { refreshAll, isPending } = useRefreshAllTelegramGroups({
    onSuccess: onSynced,
  });
  const isDisabled = disabled || isPending;

  return (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps) => (
          <Button
            {...triggerProps}
            type="button"
            variant="outline"
            size="icon"
            className={cn("size-[40px] shrink-0", triggerProps.className)}
            disabled={isDisabled}
            aria-label={
              isPending ? "Sincronizando grupos" : "Recarregar todos os grupos"
            }
            onClick={(event) => {
              triggerProps.onClick?.(event);
              refreshAll();
            }}
            onMouseEnter={(event) => {
              triggerProps.onMouseEnter?.(event);
              if (!isDisabled) {
                refreshIconRef.current?.startAnimation();
              }
            }}
            onMouseLeave={(event) => {
              triggerProps.onMouseLeave?.(event);
              refreshIconRef.current?.stopAnimation();
            }}
          >
            <RefreshCWIcon
              ref={refreshIconRef}
              size={16}
              isAnimateOnView={false}
              className={cn(isPending && "animate-spin")}
            />
          </Button>
        )}
      />
      <TooltipContent sideOffset={8} side="bottom">
        {isPending
          ? "Sincronizando todos os grupos…"
          : "Recarregar todos os grupos"}
      </TooltipContent>
    </Tooltip>
  );
}

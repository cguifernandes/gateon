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

type BotConfigRefreshButtonProps = {
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function BotConfigRefreshButton({
  isRefreshing,
  onRefresh,
}: BotConfigRefreshButtonProps) {
  const refreshIconRef = useRef<RefreshCWIconHandle>(null);

  return (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps) => (
          <Button
            {...triggerProps}
            type="button"
            variant="outline"
            size="icon"
            className={cn("size-8 shrink-0", triggerProps.className)}
            disabled={isRefreshing}
            aria-label={
              isRefreshing ? "Atualizando dados do grupo" : "Atualizar"
            }
            onClick={(event) => {
              triggerProps.onClick?.(event);
              onRefresh();
            }}
            onMouseEnter={(event) => {
              triggerProps.onMouseEnter?.(event);
              if (!isRefreshing) {
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
              className={cn(isRefreshing && "animate-spin")}
            />
          </Button>
        )}
      />
      <TooltipContent side="top" sideOffset={8}>
        {isRefreshing ? "Atualizando dados do grupo…" : "Atualizar"}
      </TooltipContent>
    </Tooltip>
  );
}

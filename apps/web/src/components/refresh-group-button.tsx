"use client";

import { useRef } from "react";
import { useRefreshTelegramGroup } from "@/app/(private)/groups/_hooks/use-refresh-telegram-group";
import {
  RefreshCWIcon,
  type RefreshCWIconHandle,
} from "@/components/icons/refresh-cw";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RefreshGroupButtonProps = {
  groupId: string;
  groupTitle?: string;
};

export function RefreshGroupButton({
  groupId,
  groupTitle,
}: RefreshGroupButtonProps) {
  const refreshIconRef = useRef<RefreshCWIconHandle>(null);
  const { refresh, isPending } = useRefreshTelegramGroup(groupId, groupTitle);

  return (
    <Button
      type="button"
      className="size-8 text-muted-foreground hover:text-foreground"
      disabled={isPending}
      onClick={() => refresh()}
      onMouseEnter={() => refreshIconRef.current?.startAnimation()}
      onMouseLeave={() => refreshIconRef.current?.stopAnimation()}
      size="icon"
      title={isPending ? "Atualizando grupo" : "Atualizar grupo"}
      variant="ghost"
    >
      <RefreshCWIcon
        ref={refreshIconRef}
        size={14}
        className={cn(isPending && "animate-spin")}
      />
      <span className="sr-only">{isPending ? "Atualizando" : "Atualizar"}</span>
    </Button>
  );
}

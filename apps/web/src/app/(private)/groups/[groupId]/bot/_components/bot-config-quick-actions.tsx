"use client";

import { useRef } from "react";
import { ExternalLinkIcon } from "@/components/icons/external-link";
import { RefreshCWIcon } from "@/components/icons/refresh-cw";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TelegramGroupDetailDto } from "@/lib/zod/telegram-group-connection-schemas";
import { buildTelegramGroupUrl } from "./bot-config-utils";

type BotConfigQuickActionsProps = {
  group: TelegramGroupDetailDto;
  isRefreshing: boolean;
  onRefreshPermissions: () => void;
};

export function BotConfigQuickActions({
  group,
  isRefreshing,
  onRefreshPermissions,
}: BotConfigQuickActionsProps) {
  const telegramUrl = buildTelegramGroupUrl(group.telegramChatId);
  const externalLinkRef = useRef<{ startAnimation: () => void; stopAnimation: () => void }>(null);
  const refreshRef = useRef<{ startAnimation: () => void; stopAnimation: () => void }>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {telegramUrl ? (
        <a
          href={telegramUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
          onMouseEnter={() => externalLinkRef.current?.startAnimation()}
          onMouseLeave={() => externalLinkRef.current?.stopAnimation()}
        >
          <ExternalLinkIcon
            ref={externalLinkRef}
            size={14}
            isAnimateOnView={false}
          />
          Abrir no Telegram
        </a>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ExternalLinkIcon size={14} isAnimateOnView={false} />
          Abrir no Telegram
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isRefreshing}
        onClick={onRefreshPermissions}
        className="gap-2"
        onMouseEnter={() => refreshRef.current?.startAnimation()}
        onMouseLeave={() => refreshRef.current?.stopAnimation()}
      >
        <RefreshCWIcon
          ref={refreshRef}
          size={14}
          isAnimateOnView={false}
          className={cn(isRefreshing && "animate-spin")}
        />
        Revalidar permissões
      </Button>
    </div>
  );
}

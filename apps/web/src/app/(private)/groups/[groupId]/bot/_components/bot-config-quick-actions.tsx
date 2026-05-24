"use client";

import { ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRefreshTelegramGroup } from "@/app/(private)/groups/_hooks/use-refresh-telegram-group";
import { RemoveGroupDialog } from "@/components/remove-group-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TelegramGroupDetailDto } from "@/lib/zod/telegram-group-connection-schemas";
import { buildTelegramGroupUrl } from "./bot-config-utils";

type BotConfigQuickActionsProps = {
  group: TelegramGroupDetailDto;
};

export function BotConfigQuickActions({ group }: BotConfigQuickActionsProps) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const telegramUrl = buildTelegramGroupUrl(group.telegramChatId);
  const { refresh, isPending } = useRefreshTelegramGroup(
    group.id,
    group.title ?? undefined,
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {telegramUrl ? (
          <a
            href={telegramUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            <ExternalLink size={14} />
            Abrir no Telegram
          </a>
        ) : (
          <Button variant="outline" disabled>
            <ExternalLink size={14} />
            Abrir no Telegram
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => refresh()}
        >
          <RefreshCw className={cn(isPending && "animate-spin")} size={14} />
          Revalidar permissões
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setRemoveOpen(true)}
        >
          <Trash2 size={14} />
          Desconectar bot
        </Button>
      </div>

      <RemoveGroupDialog
        groupId={group.id}
        groupTitle={group.title ?? ""}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
      />
    </>
  );
}

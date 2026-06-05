import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ImageComponent } from "@/components/image-component";
import { Badge } from "@/components/ui/badge";
import { getBotConfigStatusDisplay } from "@/lib/telegram-bot-status";
import { cn, withCacheBuster } from "@/lib/utils";
import type { TelegramGroupDetailDto } from "@/lib/zod/telegram-group-connection-schemas";
import { formatTelegramGroupType } from "./bot-config-utils";

type BotConfigHeaderProps = {
  group: TelegramGroupDetailDto;
};

export function BotConfigHeader({ group }: BotConfigHeaderProps) {
  const status = getBotConfigStatusDisplay(group.botStatus);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/30 px-5 py-3 text-muted-foreground text-xs">
        <Link
          href="/groups"
          className="transition-colors hover:text-foreground"
        >
          Grupos
        </Link>
        <ChevronRight size={12} className="shrink-0" />
        <span className="truncate text-foreground">
          {group.title ?? "Sem nome"}
        </span>
        <ChevronRight size={12} className="shrink-0" />
        <span>Configuração do Bot</span>
      </div>

      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <ImageComponent
            src={
              group.chatPhotoUrl
                ? withCacheBuster(group.chatPhotoUrl, group.updatedAt)
                : null
            }
            alt={group.title?.trim() || "Grupo sem título"}
            width={56}
            height={56}
            sizes="56px"
            avatarFallbackClassName="text-xl"
            className="size-14 shrink-0 rounded-xl border border-border object-cover"
          />
          <div className="min-w-0 space-y-1">
            <h1 className="truncate font-heading text-xl font-bold tracking-tight">
              {group.title ?? "Grupo sem nome"}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("gap-1.5 text-xs", status.className)}
              >
                <span
                  aria-hidden
                  className={cn("size-1.5 rounded-full", status.dotClassName)}
                />
                {status.label}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {formatTelegramGroupType(group.type, group.isForum)}
              </span>
              {group.memberCount != null ? (
                <span className="text-muted-foreground text-xs">
                  {group.memberCount.toLocaleString("pt-BR")} membros
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

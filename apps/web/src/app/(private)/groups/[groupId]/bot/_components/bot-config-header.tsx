import { Bot, ShieldCheck, Users } from "lucide-react";
import { ImageComponent } from "@/components/image-component";
import { Badge } from "@/components/ui/badge";
import { getBotConfigStatusDisplay } from "@/lib/telegram-bot-status";
import { cn, withCacheBuster } from "@/lib/utils";
import type { TelegramGroupDetailDto } from "@/lib/zod/telegram-group-connection-schemas";
import { formatDate, formatTelegramGroupType } from "./bot-config-utils";

type BotConfigHeaderProps = {
  group: TelegramGroupDetailDto;
};

export function BotConfigHeader({ group }: BotConfigHeaderProps) {
  const status = getBotConfigStatusDisplay(group.botStatus);

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="border-border border-b bg-muted/30 px-5 py-4">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.16em]">
          Configuração do Bot
        </p>
      </div>
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <ImageComponent
            src={
              group.chatPhotoUrl
                ? withCacheBuster(group.chatPhotoUrl, group.updatedAt)
                : null
            }
            alt={group.title?.trim() || "Grupo sem título"}
            width={64}
            height={64}
            sizes="64px"
            avatarFallbackClassName="text-2xl"
            className="size-16 shrink-0 rounded-2xl border border-border object-cover"
          />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-heading text-2xl font-extrabold tracking-tight">
                {group.title ?? "Grupo sem nome"}
              </h1>
              <Badge
                variant="outline"
                className={cn("gap-1.5", status.className)}
              >
                <span
                  aria-hidden
                  className={cn("size-1.5 rounded-full", status.dotClassName)}
                />
                {status.label}
              </Badge>
            </div>
            <p className="truncate text-muted-foreground text-sm">
              {group.telegramChatId}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[440px]">
          <HeaderMetric
            icon={Users}
            label="Membros"
            value={group.memberCount?.toLocaleString("pt-BR") ?? "Sem dados"}
          />
          <HeaderMetric
            icon={ShieldCheck}
            label="Conectado"
            value={formatDate(group.connectedAt)}
          />
          <HeaderMetric
            icon={Bot}
            label="Tipo"
            value={formatTelegramGroupType(group.type, group.isForum)}
          />
        </div>
      </div>
    </div>
  );
}

function HeaderMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-1 truncate font-medium text-foreground text-sm">
        {value}
      </p>
    </div>
  );
}

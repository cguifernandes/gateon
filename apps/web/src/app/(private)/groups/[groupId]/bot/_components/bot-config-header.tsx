import Link from "next/link";
import type { ReactNode } from "react";
import { TelegramGroupTypeBadges } from "@/app/(private)/groups/_components/table/telegram-group-type-badges";
import { ImageComponent } from "@/components/image-component";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getBotConfigStatusDisplay } from "@/lib/telegram-bot-status";
import { cn, withCacheBuster } from "@/lib/utils";
import type { TelegramGroupDetailDto } from "@/lib/zod/telegram-group-connection-schemas";

type BotConfigHeaderProps = {
  group: TelegramGroupDetailDto;
  actions?: ReactNode;
};

export function BotConfigHeader({ group, actions }: BotConfigHeaderProps) {
  const status = getBotConfigStatusDisplay(group.botStatus);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Breadcrumb className="border-b border-border px-5 py-3">
        <BreadcrumbList className="text-xs">
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/groups" />}>
              Grupos
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="truncate text-foreground">
              {group.title ?? "Sem nome"}
            </span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Configuração do Bot</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex min-w-0 items-start gap-4">
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
            className="size-14 shrink-0 rounded-full border border-border object-cover"
          />
          <div className="min-w-0 space-y-1">
            <h1 className="truncate font-heading text-xl font-medium tracking-tight">
              {group.title ?? "Grupo sem nome"}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={status.variant}
                className={cn("shrink-0 gap-1.5 font-medium", status.className)}
              >
                {status.dotClassName ? (
                  <span
                    aria-hidden
                    className={cn("size-1.5 rounded-full", status.dotClassName)}
                  />
                ) : null}
                {status.label}
              </Badge>
              <TelegramGroupTypeBadges
                type={group.type}
                isForum={group.isForum}
              />
              {group.memberCount != null ? (
                <Badge variant="outline" className="shrink-0 font-medium">
                  {group.memberCount.toLocaleString("pt-BR")} membros
                </Badge>
              ) : null}
            </div>
          </div>
          {actions ? <div className="ml-auto shrink-0">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}

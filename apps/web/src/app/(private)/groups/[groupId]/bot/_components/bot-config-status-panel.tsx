import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getBotConfigStatusDisplay,
  getBotPermissionsHealthDisplay,
} from "@/lib/telegram-bot-status";
import { cn } from "@/lib/utils";
import type { TelegramGroupDetailDto } from "@/lib/zod/telegram-group-connection-schemas";
import { formatDate, formatTelegramGroupType } from "./bot-config-utils";

type BotConfigStatusPanelProps = {
  group: TelegramGroupDetailDto;
};

export function BotConfigStatusPanel({ group }: BotConfigStatusPanelProps) {
  const status = getBotConfigStatusDisplay(group.botStatus);
  const missingCount = group.permissions?.missingRequiredRightIds.length ?? 0;
  const hasRequiredPermissions = missingCount === 0;
  const permissionsHealth = getBotPermissionsHealthDisplay(
    hasRequiredPermissions,
    missingCount,
  );

  return (
    <div className="xl:sticky xl:top-4">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Status da integração</CardTitle>
          <CardDescription>
            {hasRequiredPermissions ? (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                Bot com permissões completas
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                {missingCount}{" "}
                {missingCount === 1
                  ? "permissão pendente"
                  : "permissões pendentes"}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-sm">Bot</span>
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
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-sm">Permissões</span>
            <Badge
              variant={permissionsHealth.variant}
              className={cn(
                "shrink-0 gap-1.5 font-medium",
                permissionsHealth.className,
              )}
            >
              {permissionsHealth.dotClassName ? (
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    permissionsHealth.dotClassName,
                  )}
                />
              ) : null}
              {permissionsHealth.label}
            </Badge>
          </div>

          <div className="mt-1 grid gap-3 rounded-xl border border-border bg-background p-3 text-sm">
            <PanelLine
              label="Tipo"
              value={formatTelegramGroupType(group.type, group.isForum)}
            />
            <PanelLine
              label="Total no grupo"
              value={
                group.memberCount != null
                  ? group.memberCount.toLocaleString("pt-BR")
                  : "Indisponível"
              }
            />
            <PanelLine
              label="Gerenciados"
              value={`${group.trackedMemberCount.toLocaleString("pt-BR")} / ${group.trackedMemberLimitPerGroup.toLocaleString("pt-BR")}`}
            />
            <PanelLine
              label="Conectado em"
              value={formatDate(group.connectedAt)}
            />
            <PanelLine
              label="Última sincronização"
              value={formatDate(group.updatedAt)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PanelLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

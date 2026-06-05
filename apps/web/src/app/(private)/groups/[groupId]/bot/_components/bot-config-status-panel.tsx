import { Activity, CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBotConfigStatusDisplay } from "@/lib/telegram-bot-status";
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

  return (
    <div className="lg:sticky lg:top-4">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity size={16} /> Status da integração
          </CardTitle>
          <CardDescription>
            {hasRequiredPermissions ? (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 size={13} />
                Bot com permissões completas
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                <ShieldAlert size={13} />
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
            <Badge variant="outline" className={cn("gap-1.5", status.className)}>
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", status.dotClassName)}
              />
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-sm">Permissões</span>
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5",
                hasRequiredPermissions
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
                  : "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  hasRequiredPermissions ? "bg-green-500" : "bg-yellow-500",
                )}
              />
              {hasRequiredPermissions ? "Saudável" : `${missingCount} pendente`}
            </Badge>
          </div>

          <div className="mt-1 grid gap-2 rounded-xl border border-border bg-background/70 p-3 text-sm">
            <PanelLine
              label="Tipo"
              value={formatTelegramGroupType(group.type, group.isForum)}
            />
            <PanelLine
              label="Membros rastreados"
              value={group.trackedMemberCount.toLocaleString("pt-BR")}
            />
            <PanelLine
              label="Última sync"
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

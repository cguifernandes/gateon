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
    <div className="space-y-4 lg:sticky lg:top-4">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={18} /> Status do grupo
          </CardTitle>
          <CardDescription>
            Saúde operacional da integração com o Telegram.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusRow
            label="Bot"
            value={status.label}
            className={status.className}
            dotClassName={status.dotClassName}
          />
          <StatusRow
            label="Permissões"
            value={
              hasRequiredPermissions ? "Saudável" : `${missingCount} pendente`
            }
            className={
              hasRequiredPermissions
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
                : "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400"
            }
            dotClassName={
              hasRequiredPermissions ? "bg-green-500" : "bg-yellow-500"
            }
          />
          <div className="grid gap-2 rounded-2xl border border-border bg-background/70 p-3 text-sm">
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

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasRequiredPermissions ? (
              <CheckCircle2 className="text-green-500" size={18} />
            ) : (
              <ShieldAlert className="text-yellow-500" size={18} />
            )}
            Saúde da integração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {hasRequiredPermissions
              ? "O bot está com as permissões essenciais para automatizar este grupo."
              : "Revalide as permissões e ajuste o bot como administrador no Telegram."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({
  label,
  value,
  className,
  dotClassName,
}: {
  label: string;
  value: string;
  className: string;
  dotClassName: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-sm">{label}</span>
      <Badge variant="outline" className={cn("gap-1.5", className)}>
        <span
          aria-hidden
          className={cn("size-1.5 rounded-full", dotClassName)}
        />
        {value}
      </Badge>
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

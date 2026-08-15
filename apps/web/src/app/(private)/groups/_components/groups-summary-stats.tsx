import type { ComponentType } from "react";
import { ShieldCheckIcon } from "@/components/icons/shield-check";
import { TrendingUpIcon } from "@/components/icons/trending-up";
import { UsersIcon } from "@/components/icons/users";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TelegramGroupsListSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

type GroupsSummaryStatsProps = {
  summary: TelegramGroupsListSummaryDto;
};

type SummaryStatTone = "default" | "success" | "warning";

type SummaryStatProps = {
  icon: ComponentType<{ className?: string; size?: number }>;
  value: number | string;
  label: string;
  tone?: SummaryStatTone;
};

function SummaryStat({
  icon: Icon,
  value,
  label,
  tone = "default",
}: SummaryStatProps) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 flex-1 text-muted-foreground text-xs sm:text-sm">
            {label}
          </p>
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full",
              tone === "success" && "bg-green-500/10 text-green-500",
              tone === "warning" && "bg-yellow-500/10 text-yellow-500",
              tone === "default" && "bg-muted text-muted-foreground",
            )}
          >
            <Icon size={12} aria-hidden />
          </span>
        </div>
        <p className="font-semibold text-foreground text-xl tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function GroupsSummaryStats({ summary }: GroupsSummaryStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-3">
      <SummaryStat
        icon={UsersIcon}
        value={summary.totalGroups}
        label="Quantidade de grupos conectados"
      />
      <SummaryStat
        icon={ShieldCheckIcon}
        value={summary.pendingPermissionsCount}
        label="Grupos esperando permissão"
        tone="warning"
      />
      <SummaryStat
        icon={TrendingUpIcon}
        value={`${summary.planMemberUsagePercent}%`}
        label="Membros do plano em uso"
      />
    </div>
  );
}

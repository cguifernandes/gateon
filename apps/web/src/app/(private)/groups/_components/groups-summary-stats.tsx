import type { ComponentType } from "react";
import { ShieldCheckIcon } from "@/components/icons/shield-check";
import { TrendingUpIcon } from "@/components/icons/trending-up";
import { UsersIcon } from "@/components/icons/users";
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
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          tone === "success" && "bg-green-500/10 text-green-500",
          tone === "warning" && "bg-yellow-500/10 text-yellow-500",
          tone === "default" && "bg-muted text-muted-foreground",
        )}
      >
        <Icon size={14} aria-hidden />
      </span>
      <p className="text-sm leading-none text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">
          {value}
        </span>{" "}
        {label}
      </p>
    </div>
  );
}

export function GroupsSummaryStats({ summary }: GroupsSummaryStatsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
      <SummaryStat
        icon={UsersIcon}
        value={summary.totalGroups}
        label="grupos"
      />
      <SummaryStat
        icon={ShieldCheckIcon}
        value={summary.pendingPermissionsCount}
        label="grupos esperando permissão"
        tone="warning"
      />
      <SummaryStat
        icon={TrendingUpIcon}
        value={`${summary.planMemberUsagePercent}%`}
        label="membros do plano em uso"
      />
    </div>
  );
}

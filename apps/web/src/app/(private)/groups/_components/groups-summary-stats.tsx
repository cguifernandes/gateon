import type { ComponentType } from "react";
import { ShieldCheckIcon } from "@/components/icons/shield-check";
import { TrendingUpIcon } from "@/components/icons/trending-up";
import { UsersIcon } from "@/components/icons/users";
import {
  type BotStatusDisplayKind,
  getBotStatusDisplayKind,
} from "@/lib/telegram-bot-status";
import { cn } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

type GroupsSummaryStatsProps = {
  groups: TelegramGroupSummaryDto[];
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

function countGroupsByBotStatusKind(
  groups: TelegramGroupSummaryDto[],
  kind: BotStatusDisplayKind,
): number {
  return groups.filter(
    (group) => getBotStatusDisplayKind(group.botStatus) === kind,
  ).length;
}

function getPlanMemberUsagePercent(groups: TelegramGroupSummaryDto[]): number {
  const totalTracked = groups.reduce(
    (sum, group) => sum + group.trackedMemberCount,
    0,
  );
  const totalCapacity = groups.reduce(
    (sum, group) => sum + group.trackedMemberLimitPerGroup,
    0,
  );

  if (totalCapacity <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((totalTracked / totalCapacity) * 100));
}

export function GroupsSummaryStats({ groups }: GroupsSummaryStatsProps) {
  const totalGroups = groups.length;
  const pendingPermissionsCount = countGroupsByBotStatusKind(groups, "warning");
  const planMemberUsagePercent = getPlanMemberUsagePercent(groups);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
      <SummaryStat icon={UsersIcon} value={totalGroups} label="grupos" />
      <SummaryStat
        icon={ShieldCheckIcon}
        value={pendingPermissionsCount}
        label="grupos esperando permissão"
        tone="warning"
      />
      <SummaryStat
        icon={TrendingUpIcon}
        value={`${planMemberUsagePercent}%`}
        label="membros do plano em uso"
      />
    </div>
  );
}

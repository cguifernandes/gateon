import type { ComponentType } from "react";
import { CircleCheckIcon } from "@/components/icons/circle-check";
import { UserRoundMinusIcon } from "@/components/icons/user-round-minus";
import { UsersIcon } from "@/components/icons/users";
import { cn } from "@/lib/utils";
import type { TelegramMembersListSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

type MemberSummaryStatsProps = {
  summary: TelegramMembersListSummaryDto;
};

type SummaryStatTone = "default" | "success" | "warning";

type SummaryStatProps = {
  icon: ComponentType<{ className?: string; size?: number }>;
  value: number;
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

export function MemberSummaryStats({ summary }: MemberSummaryStatsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
      <SummaryStat
        icon={UsersIcon}
        value={summary.totalMembers}
        label="membros"
      />
      <SummaryStat
        icon={UserRoundMinusIcon}
        value={summary.leftCount}
        label="saíram"
      />
      <SummaryStat
        icon={CircleCheckIcon}
        value={summary.activeCount}
        label="ativos"
        tone="success"
      />
    </div>
  );
}

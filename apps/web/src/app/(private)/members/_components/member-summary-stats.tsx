import type { ComponentType } from "react";
import { CircleCheckIcon } from "@/components/icons/circle-check";
import { UserRoundMinusIcon } from "@/components/icons/user-round-minus";
import { UsersIcon } from "@/components/icons/users";
import { cn } from "@/lib/utils";
import type { MemberSummary } from "./members-table-helpers";

type MemberSummaryStatsProps = {
  members: MemberSummary[];
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

export function MemberSummaryStats({ members }: MemberSummaryStatsProps) {
  const totalMembers = members.length;
  const totalLeftMembers = members.filter(
    (member) => member.status === "left",
  ).length;
  const totalActiveMembers = members.filter(
    (member) => member.status === "active",
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
      <SummaryStat icon={UsersIcon} value={totalMembers} label="membros" />
      <SummaryStat
        icon={UserRoundMinusIcon}
        value={totalLeftMembers}
        label="saíram"
      />
      <SummaryStat
        icon={CircleCheckIcon}
        value={totalActiveMembers}
        label="ativos"
        tone="success"
      />
    </div>
  );
}

import Link from "next/link";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { BadgeAlertIcon } from "@/components/icons/badge-alert";
import { BanIcon } from "@/components/icons/ban";
import { CircleCheckIcon } from "@/components/icons/circle-check";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IconAnimationHandle } from "@/hooks/use-icon-animation";
import {
  type BotStatusDisplay,
  getBotStatusDisplayKind,
} from "@/lib/telegram-bot-status";
import { cn } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

type DashboardConnectedBotsCardProps = {
  groups: TelegramGroupSummaryDto[];
};

type DashboardBotHealthKind = "active" | "missing_permissions" | "disconnected";

type HealthIconComponent = ForwardRefExoticComponent<
  {
    size?: number;
    isAnimateOnView?: boolean;
  } & RefAttributes<IconAnimationHandle>
>;

type HealthStatConfig = {
  display: BotStatusDisplay & { summaryLabel: string };
  icon: HealthIconComponent;
  iconClassName: string;
};

const DASHBOARD_BOT_HEALTH: Record<DashboardBotHealthKind, HealthStatConfig> = {
  active: {
    display: {
      label: "Ativo",
      summaryLabel: "Ativo",
      variant: "outline",
      className:
        "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
      dotClassName: "bg-green-500",
    },
    icon: CircleCheckIcon,
    iconClassName:
      "bg-green-500/10 text-green-500 ring-1 ring-green-500/25 dark:text-green-400",
  },
  missing_permissions: {
    display: {
      label: "Faltando permissão",
      summaryLabel: "Faltando permissão",
      variant: "alert",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
      dotClassName: "bg-amber-500",
    },
    icon: BadgeAlertIcon,
    iconClassName:
      "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/25 dark:text-amber-400",
  },
  disconnected: {
    display: {
      label: "Desconectado",
      summaryLabel: "Desconectado",
      variant: "ghost",
      className:
        "border-border bg-muted/60 text-muted-foreground dark:bg-muted/40",
      dotClassName: "bg-muted-foreground/70",
    },
    icon: BanIcon,
    iconClassName: "bg-muted text-muted-foreground ring-1 ring-border",
  },
};

const HEALTH_SUMMARY_ORDER: DashboardBotHealthKind[] = [
  "active",
  "missing_permissions",
  "disconnected",
];

function getDashboardBotHealthKind(rawStatus: string): DashboardBotHealthKind {
  const kind = getBotStatusDisplayKind(rawStatus);

  if (kind === "active") return "active";
  if (kind === "warning") return "missing_permissions";
  return "disconnected";
}

function countGroupsByHealthKind(
  groups: TelegramGroupSummaryDto[],
  healthKind: DashboardBotHealthKind,
): number {
  return groups.filter(
    (group) => getDashboardBotHealthKind(group.botStatus) === healthKind,
  ).length;
}

type BotHealthStatCardProps = {
  healthKind: DashboardBotHealthKind;
  count: number;
  isLast: boolean;
};

function BotHealthStatCard({
  healthKind,
  count,
  isLast,
}: BotHealthStatCardProps) {
  const {
    display,
    icon: Icon,
    iconClassName,
  } = DASHBOARD_BOT_HEALTH[healthKind];

  return (
    <div
      className={cn(
        "rounded-lg border border-border p-3 flex flex-col justify-between gap-2",
        isLast && "sm:col-span-2",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          iconClassName,
        )}
      >
        <Icon size={18} isAnimateOnView />
      </span>

      <div className="flex flex-col justify-between gap-1">
        <p className="mt-2 font-semibold font-heading text-2xl leading-none tabular-nums">
          {count}
        </p>
        <p className="text-muted-foreground text-xs">{display.summaryLabel}</p>
      </div>
    </div>
  );
}

export function DashboardConnectedBotsCard({
  groups,
}: DashboardConnectedBotsCardProps) {
  const healthCounts = HEALTH_SUMMARY_ORDER.map((healthKind) => ({
    healthKind,
    count: countGroupsByHealthKind(groups, healthKind),
  }));

  return (
    <Card className="flex h-full min-h-0 w-full flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="flex shrink-0 flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <CardTitle>Saúde dos bots</CardTitle>
        <Link
          href="/groups"
          className={cn(
            buttonVariants({ variant: "link" }),
            "h-fit p-0 text-xs",
          )}
        >
          Ver grupos
        </Link>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto p-0">
        {groups.length === 0 ? (
          <div className="flex min-h-52 items-center justify-center px-5 text-center text-muted-foreground text-sm">
            Nenhum grupo conectado.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-2">
            {healthCounts.map(({ healthKind, count }, index) => (
              <BotHealthStatCard
                key={healthKind}
                healthKind={healthKind}
                count={count}
                isLast={index === healthCounts.length - 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

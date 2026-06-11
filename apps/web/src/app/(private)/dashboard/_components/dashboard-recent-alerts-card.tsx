"use client";

import { CheckIcon, UserRoundIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AlertSummaryDto } from "@/lib/zod/alert-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { useDashboardFilters } from "./dashboard-filters-context";
import {
  DATE_PRESET_LABELS,
  filterAlertsForGroupInRange,
  getPresetRange,
} from "./dashboard-insights-utils";

type TimelineTone = "success" | "error" | "info";

const TIMELINE_STYLES: Record<TimelineTone, { iconClass: string }> = {
  success: {
    iconClass:
      "border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
  },
  error: {
    iconClass:
      "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
  },
  info: {
    iconClass:
      "border border-border bg-muted/60 text-muted-foreground dark:bg-muted/40",
  },
};

function formatAlertTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTimelineMeta(alert: AlertSummaryDto, groupTitle: string) {
  const runStatus = alert.lastRun?.status;

  if (runStatus === "FAILED") {
    return {
      tone: "error" as const,
      title: "Falha na automação",
      description: `${alert.name} falhou em ${groupTitle}`,
      icon: XIcon,
    };
  }

  if (runStatus === "COMPLETED" || runStatus === "PARTIAL") {
    return {
      tone: "success" as const,
      title: alert.name,
      description:
        runStatus === "PARTIAL"
          ? `Entrega parcial em ${groupTitle}`
          : `Mensagem entregue em ${groupTitle}`,
      icon: CheckIcon,
    };
  }

  if (alert.status === "FAILED") {
    return {
      tone: "error" as const,
      title: "Alerta com falha",
      description: `${alert.name} precisa de atenção em ${groupTitle}`,
      icon: XIcon,
    };
  }

  return {
    tone: "info" as const,
    title: alert.name,
    description: `Atividade registrada em ${groupTitle}`,
    icon: UserRoundIcon,
  };
}

type DashboardRecentAlertsCardProps = {
  groups: TelegramGroupSummaryDto[];
  alerts: AlertSummaryDto[];
};

export function DashboardRecentAlertsCard({
  groups,
  alerts,
}: DashboardRecentAlertsCardProps) {
  const { datePreset, selectedGroupId } = useDashboardFilters();
  const range = getPresetRange(datePreset);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? groups[0],
    [groups, selectedGroupId],
  );

  const timelineItems = useMemo(() => {
    if (!selectedGroup) return [];

    const groupTitle =
      selectedGroup.title?.trim() || selectedGroup.telegramChatId;

    return filterAlertsForGroupInRange(selectedGroup.id, alerts, range)
      .slice(0, 6)
      .map((alert) => {
        const meta = getTimelineMeta(alert, groupTitle);
        return {
          id: alert.id,
          ...meta,
          timeLabel: formatAlertTime(alert.lastRunAt),
        };
      });
  }, [alerts, range, selectedGroup]);

  return (
    <Card className="flex h-fit min-h-0 w-full flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="flex shrink-0 flex-row items-start justify-between border-b border-border p-5">
        <div className="flex flex-col gap-y-1">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Alertas recentes
          </CardTitle>
          <p className="text-foreground font-heading text-sm font-medium">
            {selectedGroup
              ? selectedGroup.title?.trim() || selectedGroup.telegramChatId
              : "Nenhum grupo selecionado"}
          </p>
          <p className="text-muted-foreground text-xs">
            {DATE_PRESET_LABELS[datePreset]}
          </p>
        </div>
        <Link
          href="/alerts"
          className={cn(buttonVariants({ variant: "link" }), "p-0 h-fit")}
        >
          Ver alertas
        </Link>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
        {timelineItems.length === 0 ? (
          <div className="flex min-h-52 items-center justify-center text-center text-muted-foreground text-sm">
            Nenhum alerta executado no período selecionado.
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <ul className="space-y-0">
              {timelineItems.map((item, index) => {
                const Icon = item.icon;
                const styles = TIMELINE_STYLES[item.tone];
                const isLast = index === timelineItems.length - 1;

                return (
                  <li key={item.id} className="flex gap-3">
                    <div className="flex w-8 shrink-0 flex-col items-center self-stretch">
                      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center">
                        <span
                          className={cn(
                            "flex size-6 items-center justify-center rounded-full",
                            styles.iconClass,
                          )}
                        >
                          <Icon className="size-3" />
                        </span>
                      </span>
                      {!isLast ? (
                        <span aria-hidden className="w-px flex-1 bg-border" />
                      ) : null}
                    </div>
                    <div
                      className={cn("min-w-0 flex-1 pt-0.5", !isLast && "pb-6")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold font-heading text-foreground text-sm">
                          {item.title}
                        </p>
                        <time className="shrink-0 text-muted-foreground text-xs font-light">
                          {item.timeLabel}
                        </time>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

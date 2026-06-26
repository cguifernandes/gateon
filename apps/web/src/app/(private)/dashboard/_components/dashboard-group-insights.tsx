"use client";

import Link from "next/link";
import { useId, useMemo } from "react";
import { RocketIcon } from "@/components/icons/rocket";
import { UsersIcon } from "@/components/icons/users";
import { ImageComponent } from "@/components/image-component";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGroupLimit } from "@/contexts/group-limit-context";
import {
  getMaxGroupsForPlan,
  getMaxManagedMembersPerGroupForPlan,
  PLAN_LABELS,
} from "@/lib/plan/limits";
import { cn, withCacheBuster } from "@/lib/utils";
import type { AlertSummaryDto } from "@/lib/zod/alert-schemas";
import type { PlanId } from "@/lib/zod/plan-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { useDashboardFilters } from "./dashboard-filters-context";
import {
  buildDeliverySparkline,
  buildExitSparkline,
  buildRetentionSparkline,
  computeTrendDelta,
  countMemberExitsInRange,
  DATE_PRESET_LABELS,
  type DatePreset,
  type DateRangeBounds,
  getGroupDeliveryRate,
  getGroupExitRate,
  getGroupHistoricalRange,
  getGroupRetentionRate,
  getPresetRange,
  getPreviousRange,
  getSparklineIntervalDescription,
} from "./dashboard-insights-utils";

const INSIGHT_ACCENTS = {
  primary: {
    stroke: "stroke-primary",
    fill: "var(--color-primary)",
  },
  emerald: {
    stroke: "stroke-emerald-500",
    fill: "#10b981",
  },
  violet: {
    stroke: "stroke-violet-500",
    fill: "#8b5cf6",
  },
} as const;

const INSIGHT_CARD_STYLES = {
  primary: {
    surface: "bg-linear-to-br from-card via-card to-primary/30",
  },
  emerald: {
    surface: "bg-linear-to-br from-card via-card to-emerald-500/25",
  },
  violet: {
    surface: "bg-linear-to-br from-card via-card to-violet-500/25",
  },
} as const;

const UPGRADE_PLAN_ID: PlanId = "starter";
const MOCK_PLAN_PRICES: Record<PlanId, string> = {
  free: "R$ 0",
  starter: "R$ 49",
  pro: "R$ 129",
};

type InsightSparklineProps = {
  data: number[];
  metricLabel: string;
  datePreset: DatePreset;
  historicalRange?: DateRangeBounds;
  formatPointValue?: (value: number, index: number, total: number) => string;
  strokeClassName?: string;
  fillColor?: string;
};

function InsightSparkline({
  data,
  metricLabel,
  datePreset,
  historicalRange,
  formatPointValue,
  strokeClassName = "stroke-primary",
  fillColor = "var(--color-primary)",
}: InsightSparklineProps) {
  const gradientId = useId();
  const normalized =
    data.length === 0
      ? [0, 0]
      : data.length === 1
        ? [data[0] ?? 0, data[0] ?? 0]
        : data;

  const width = 280;
  const height = 112;
  const topPadding = 6;
  const plotHeight = height - topPadding;
  const min = Math.min(...normalized, 0);
  const max = Math.max(...normalized, 1);
  const range = Math.max(max - min, 1);

  const points = normalized.map((value, index) => ({
    x: (index / (normalized.length - 1)) * width,
    y: height - ((value - min) / range) * plotHeight,
    value,
  }));
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const columnWidth = 100 / normalized.length;

  return (
    <div className="relative mt-auto h-28 w-full flex-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="pointer-events-none block h-28 w-full"
        aria-hidden
      >
        <title>{metricLabel}</title>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          className={cn(strokeClassName, "opacity-95")}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point, index) => (
          <circle
            key={`${index}-${point.x}`}
            cx={point.x}
            cy={point.y}
            r="3"
            className={cn("fill-background", strokeClassName)}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {normalized.map((value, index) => {
        const formatted =
          formatPointValue?.(value, index, normalized.length) ?? `${value}`;
        const interval = getSparklineIntervalDescription(
          datePreset,
          index,
          normalized.length,
          historicalRange,
        );

        return (
          <Tooltip key={`${index}-${value}`}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={`${metricLabel}: ${formatted}. ${interval.title}. ${interval.description}`}
                  className="absolute inset-y-0 border-0 bg-transparent p-0 transition-colors hover:bg-foreground/5"
                  style={{
                    left: `${index * columnWidth}%`,
                    width: `${columnWidth}%`,
                  }}
                />
              }
            />
            <TooltipContent side="top" sideOffset={6} className="w-[290px]">
              <div className="space-y-1">
                <p className="font-medium text-sm text-heading">
                  {metricLabel}
                </p>
                <p className="text-muted-foreground">{formatted}</p>
                <p className="font-medium text-[11px]">{interval.title}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

const PLAN_CARD_SHELL_CLASS =
  "relative flex h-fit w-full flex-col gap-5 overflow-hidden rounded-xl p-5";

function PlanUpsellCard() {
  const { planId, planLabel, connectedCount, maxGroups, remaining, isAtLimit } =
    useGroupLimit();
  const isFree = planId === "free";
  const upgradeLabel = PLAN_LABELS[UPGRADE_PLAN_ID];
  const maxMembersPerGroup = getMaxManagedMembersPerGroupForPlan(planId);
  const groupUsagePercent =
    maxGroups > 0
      ? Math.min(100, Math.round((connectedCount / maxGroups) * 100))
      : 0;

  if (!isFree) {
    const upgradePlanId = planId === "starter" ? ("pro" as const) : null;

    return (
      <div
        className={cn(PLAN_CARD_SHELL_CLASS, "border border-border bg-card")}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Seu plano
            </p>
            <p className="font-heading text-2xl font-bold text-foreground">
              {planLabel}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Grupos conectados</span>
              <span className="font-medium text-foreground tabular-nums">
                {connectedCount}/{maxGroups}
              </span>
            </div>
            <Progress value={groupUsagePercent} className="h-1.5" />
            <p className="text-muted-foreground text-xs leading-relaxed">
              {isAtLimit
                ? "Limite de grupos do plano atingido."
                : `${remaining} ${remaining === 1 ? "vaga disponível" : "vagas disponíveis"}.`}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5">
          <p className="text-muted-foreground text-xs">Por grupo</p>
          <p className="mt-0.5 font-medium text-foreground text-sm">
            Até {maxMembersPerGroup.toLocaleString("pt-BR")} membros rastreados
          </p>
        </div>

        {upgradePlanId ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            Precisa escalar? O plano {PLAN_LABELS[upgradePlanId]} inclui até{" "}
            {getMaxGroupsForPlan(upgradePlanId)} grupos e{" "}
            {getMaxManagedMembersPerGroupForPlan(upgradePlanId)} membros por
            grupo.
          </p>
        ) : null}

        <Link
          href="/settings"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Gerenciar assinatura
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        PLAN_CARD_SHELL_CLASS,
        "text-primary-foreground bg-linear-to-br from-primary via-primary to-primary/50",
      )}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-8 size-36 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
          <RocketIcon size={14} isAnimateOnView />
          Plano {upgradeLabel}
        </span>
        <p className="mt-4 font-heading text-2xl font-bold leading-tight">
          Escale sua operação com mais grupos e membros
        </p>
        <p className="mt-2 text-primary-foreground/85 text-sm leading-relaxed">
          Até {getMaxGroupsForPlan(UPGRADE_PLAN_ID)} grupos e{" "}
          {getMaxManagedMembersPerGroupForPlan(UPGRADE_PLAN_ID)} membros
          rastreados por grupo.
        </p>
        <p className="mt-4 text-3xl font-bold tabular-nums">
          {MOCK_PLAN_PRICES[UPGRADE_PLAN_ID]}
          <span className="text-base font-medium opacity-80">/mês</span>
        </p>
      </div>
      <Link
        href="/#pricing"
        className={cn(
          buttonVariants({ variant: "secondary" }),
          "relative w-full bg-white text-primary hover:bg-white/90",
        )}
      >
        Assinar plano {upgradeLabel}
      </Link>
    </div>
  );
}

type GroupInsightsProps = {
  groups: TelegramGroupSummaryDto[];
  alerts: AlertSummaryDto[];
  globalDeliveryRate: number;
};

export function DashboardGroupInsights({
  groups,
  alerts,
  globalDeliveryRate,
}: GroupInsightsProps) {
  const { datePreset, setDatePreset, selectedGroupId, setSelectedGroupId } =
    useDashboardFilters();

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? groups[0],
    [groups, selectedGroupId],
  );

  const insights = useMemo(() => {
    if (!selectedGroup) return null;

    const range = getPresetRange(datePreset);
    const prevRange = getPreviousRange(range);
    const exitsInRange = countMemberExitsInRange(selectedGroup, range);
    const exitRate = getGroupExitRate(selectedGroup, range);
    const retentionRate = getGroupRetentionRate(selectedGroup);
    const deliveryRate = getGroupDeliveryRate(selectedGroup.id, alerts);
    const exitSparkline = buildExitSparkline(selectedGroup, range);

    return {
      exitsInRange,
      exitRate,
      retentionRate,
      deliveryRate,
      exitRateTrend: computeTrendDelta(
        exitRate,
        prevRange ? getGroupExitRate(selectedGroup, prevRange) : 0,
      ),
      deliveryTrend: computeTrendDelta(deliveryRate, globalDeliveryRate),
      retentionTrend: computeTrendDelta(
        retentionRate,
        Math.max(0, 100 - exitRate),
      ),
      exitSparkline,
      deliverySparkline: buildDeliverySparkline(selectedGroup.id, alerts),
      retentionSparkline: buildRetentionSparkline(retentionRate, exitSparkline),
    };
  }, [alerts, datePreset, globalDeliveryRate, selectedGroup]);

  if (!selectedGroup || !insights) {
    return (
      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6 xl:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="min-w-0">
              <p className="text-muted-foreground text-sm text-pretty">
                Indicadores aparecem após conectar um grupo.
              </p>
              <h2 className="mt-1 font-heading text-xl font-bold tracking-tight text-foreground whitespace-nowrap sm:text-2xl">
                Visão do grupo
              </h2>
            </div>

            <Empty className="min-h-[240px] w-full flex-1">
              <EmptyHeader>
                <EmptyMedia className="size-14 rounded-lg bg-primary/15 ring-1 ring-primary/25">
                  <UsersIcon className="text-primary" size={24} />
                </EmptyMedia>
                <EmptyTitle>
                  Conecte um grupo para ver os indicadores
                </EmptyTitle>
                <EmptyDescription className="max-w-sm text-pretty">
                  Os cards de saída, retenção e entrega aparecem após a primeira
                  conexão.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link
                  href="/groups"
                  className={cn(buttonVariants(), "inline-flex")}
                >
                  Conectar grupo
                </Link>
              </EmptyContent>
            </Empty>
          </div>

          <aside className="flex w-full flex-col lg:w-80 lg:shrink-0 lg:self-start xl:w-[360px]">
            <PlanUpsellCard />
          </aside>
        </div>
      </section>
    );
  }

  const groupTitle =
    selectedGroup.title?.trim() || selectedGroup.telegramChatId;
  const photoUrl = selectedGroup.chatPhotoUrl
    ? withCacheBuster(selectedGroup.chatPhotoUrl, selectedGroup.updatedAt)
    : null;
  const historicalRange =
    datePreset === "all" ? getGroupHistoricalRange(selectedGroup) : undefined;

  const cards = [
    {
      eyebrow: "Saídas",
      label: "Taxa de membros que saíram",
      value: insights.exitRate,
      detail: `${insights.exitsInRange} saíram no período`,
      trend: insights.exitRateTrend,
      trendInverted: true,
      sparkline: insights.exitSparkline,
      formatPointValue: (value: number) =>
        `${value} ${value === 1 ? "saída" : "saídas"}`,
      href: "/members",
      accent: "primary" as const,
    },
    {
      eyebrow: "Alertas",
      label: "Taxa de alertas entregues",
      value: insights.deliveryRate,
      detail: "Média de alertas",
      trend: insights.deliveryTrend,
      trendInverted: false,
      sparkline: insights.deliverySparkline,
      formatPointValue: (value: number) => `${value}% de entrega`,
      href: "/alerts",
      accent: "emerald" as const,
    },
    {
      eyebrow: "Retenção",
      label: "Taxa de membros que permaneceram",
      value: insights.retentionRate,
      detail: `${selectedGroup.trackedMemberCount} ativos agora`,
      trend: insights.retentionTrend,
      trendInverted: false,
      sparkline: insights.retentionSparkline,
      formatPointValue: (value: number) => `${value}% de retenção`,
      href: "/members",
      accent: "violet" as const,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6 xl:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-muted-foreground text-sm text-pretty xl:truncate">
                Indicadores de {groupTitle} no período selecionado.
              </p>
              <h2 className="mt-1 font-heading text-xl font-bold tracking-tight text-foreground whitespace-nowrap sm:text-2xl">
                Visão do grupo
              </h2>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 xl:w-auto xl:flex-row xl:items-center">
              <Select
                value={datePreset}
                onValueChange={(v) => setDatePreset(v as DatePreset)}
              >
                <SelectTrigger className="w-full xl:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DATE_PRESET_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedGroup.id}
                onValueChange={setSelectedGroupId}
              >
                <SelectTrigger className="w-full xl:w-48">
                  <SelectValue placeholder="Selecionar grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.title?.trim() || g.telegramChatId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const positive = card.trendInverted
                ? card.trend <= 0
                : card.trend >= 0;
              const cardStyles = INSIGHT_CARD_STYLES[card.accent];

              return (
                <div
                  key={card.label}
                  className="h-full min-h-[200px] rounded-xl border border-border"
                >
                  <div
                    className={cn(
                      "relative flex h-full min-h-[240px] flex-col overflow-hidden rounded-xl",
                      cardStyles.surface,
                    )}
                  >
                    <div className="flex shrink-0 flex-col p-4 sm:p-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <ImageComponent
                          src={photoUrl}
                          alt={groupTitle}
                          width={40}
                          height={40}
                          sizes="40px"
                          className="size-10 shrink-0 rounded-full border border-border object-cover"
                          avatarFallbackClassName="text-lg!"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-muted-foreground text-[11px] uppercase tracking-wide">
                            {card.eyebrow}
                          </p>
                          <p className="truncate font-medium text-foreground text-sm">
                            {groupTitle}
                          </p>
                        </div>
                      </div>

                      <div className="relative mt-4 min-w-0">
                        <p className="truncate text-muted-foreground text-xs">
                          {card.label}
                        </p>
                        <p className="font-heading text-2xl font-bold tracking-tight text-foreground tabular-nums">
                          {card.value}%
                        </p>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <Badge
                            variant={positive ? "outline" : "destructive"}
                            className={cn(
                              "shrink-0 tabular-nums font-medium",
                              positive &&
                                "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
                            )}
                          >
                            {card.trend > 0 ? "+" : ""}
                            {card.trend}%
                          </Badge>
                          <span className="min-w-0 truncate text-muted-foreground text-xs">
                            {card.detail}
                          </span>
                        </div>
                      </div>
                    </div>

                    <InsightSparkline
                      data={[...card.sparkline]}
                      metricLabel={card.label}
                      datePreset={datePreset}
                      historicalRange={historicalRange}
                      formatPointValue={card.formatPointValue}
                      strokeClassName={INSIGHT_ACCENTS[card.accent].stroke}
                      fillColor={INSIGHT_ACCENTS[card.accent].fill}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="flex w-full flex-col lg:w-80 lg:shrink-0 lg:self-start xl:w-[360px]">
          <PlanUpsellCard />
        </aside>
      </div>
    </section>
  );
}

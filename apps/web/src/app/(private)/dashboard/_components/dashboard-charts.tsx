"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { AlertSummaryDto } from "@/lib/zod/alert-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

const MEMBERS_CHART_CONFIG = {
  ativos: { label: "Membros ativos", color: "var(--color-primary)" },
  saidas: { label: "Saíram do grupo", color: "var(--color-muted-foreground)" },
} satisfies ChartConfig;

const ALERTS_CHART_CONFIG = {
  total: { label: "Alertas", color: "var(--color-primary)" },
} satisfies ChartConfig;

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativos",
  DRAFT: "Rascunho",
  PAUSED: "Pausados",
  FAILED: "Falharam",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "var(--color-primary)",
  DRAFT: "var(--color-muted-foreground)",
  PAUSED: "oklch(0.75 0.14 80)",
  FAILED: "var(--color-destructive)",
};

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground text-sm">
      {message}
    </div>
  );
}

export function DashboardMembersChart({
  groups,
}: {
  groups: TelegramGroupSummaryDto[];
}) {
  const data = groups.map((g) => {
    const raw = g.title ?? g.telegramChatId;
    const name = raw.length > 16 ? `${raw.slice(0, 16)}…` : raw;
    return { name, ativos: g.trackedMemberCount, saidas: g.leftMemberCount };
  });

  if (data.length === 0)
    return <ChartEmpty message="Nenhum grupo conectado ainda." />;

  return (
    <ChartContainer
      config={MEMBERS_CHART_CONFIG}
      className="h-[220px] w-full"
      initialDimension={{ width: 480, height: 220 }}
    >
      <BarChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--color-border)"
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
        />
        <ChartTooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
          content={<ChartTooltipContent />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="ativos"
          fill="var(--color-primary)"
          fillOpacity={0.9}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="saidas"
          fill="var(--color-muted-foreground)"
          fillOpacity={0.4}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function DashboardAlertsChart({
  alerts,
}: {
  alerts: AlertSummaryDto[];
}) {
  const counts: Record<string, number> = {
    ACTIVE: 0,
    DRAFT: 0,
    PAUSED: 0,
    FAILED: 0,
  };
  for (const a of alerts) {
    if (a.status in counts) counts[a.status] = (counts[a.status] ?? 0) + 1;
  }
  const data = Object.entries(counts).map(([status, total]) => ({
    status: STATUS_LABELS[status] ?? status,
    total,
    fill: STATUS_COLORS[status] ?? "var(--color-muted-foreground)",
  }));

  if (alerts.length === 0)
    return <ChartEmpty message="Nenhum alerta criado ainda." />;

  return (
    <ChartContainer
      config={ALERTS_CHART_CONFIG}
      className="h-[220px] w-full"
      initialDimension={{ width: 260, height: 220 }}
    >
      <BarChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--color-border)"
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="status"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
        />
        <ChartTooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} isAnimationActive />
      </BarChart>
    </ChartContainer>
  );
}

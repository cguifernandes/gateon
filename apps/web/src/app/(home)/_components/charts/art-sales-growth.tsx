"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const salesData = [
  { mes: "Jan", manual: 34, automatico: 18 },
  { mes: "Fev", manual: 31, automatico: 26 },
  { mes: "Mar", manual: 28, automatico: 38 },
  { mes: "Abr", manual: 22, automatico: 54 },
  { mes: "Mai", manual: 19, automatico: 71 },
  { mes: "Jun", manual: 14, automatico: 92 },
];

const chartConfig = {
  automatico: {
    label: "Liberações automáticas",
    color: "var(--color-primary)",
  },
  manual: { label: "Processo manual", color: "var(--color-muted-foreground)" },
} satisfies ChartConfig;

export function FeatureCardArtSalesGrowth() {
  return (
    <div className="flex h-full select-none flex-col justify-center gap-3 sm:absolute sm:inset-0">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            Automático
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
            Manual
          </span>
        </div>
        <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
          Últimos 6 meses
        </span>
      </div>
      <ChartContainer config={chartConfig} className="h-[130px] w-full">
        <AreaChart
          data={salesData}
          margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
        >
          <defs>
            <linearGradient id="sg-auto" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-primary)"
                stopOpacity={0.2}
              />
              <stop
                offset="95%"
                stopColor="var(--color-primary)"
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="sg-manual" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-muted-foreground)"
                stopOpacity={0.12}
              />
              <stop
                offset="95%"
                stopColor="var(--color-muted-foreground)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-border)"
            strokeOpacity={0.6}
          />
          <XAxis
            dataKey="mes"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="manual"
            stroke="var(--color-muted-foreground)"
            strokeWidth={1.5}
            strokeOpacity={0.5}
            fill="url(#sg-manual)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="automatico"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#sg-auto)"
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

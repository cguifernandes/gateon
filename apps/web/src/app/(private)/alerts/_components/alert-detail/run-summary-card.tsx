import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  type AlertRunRecordDto,
  alertRunStatusLabels,
} from "@/lib/zod/alert-schemas";

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function RunStatusValue({ status }: { status: AlertRunRecordDto["status"] }) {
  const dotClassName =
    status === "COMPLETED"
      ? "bg-green-500"
      : status === "PARTIAL"
        ? "bg-amber-400"
        : status === "FAILED"
          ? "bg-destructive"
          : "bg-muted-foreground";

  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
      <span
        className={cn("size-2 shrink-0 rounded-full", dotClassName)}
        aria-hidden
      />
      {alertRunStatusLabels[status]}
    </span>
  );
}

type SummaryMetricProps = {
  label: string;
  children: ReactNode;
  labelClassName?: string;
  valueClassName?: string;
};

function SummaryMetric({
  label,
  children,
  labelClassName,
  valueClassName,
}: SummaryMetricProps) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
      <p className={cn("text-muted-foreground text-xs", labelClassName)}>
        {label}
      </p>
      <div className={cn("mt-1 text-sm", valueClassName)}>{children}</div>
    </div>
  );
}

type AlertRunSummaryCardProps = {
  run: AlertRunRecordDto;
};

export function AlertRunSummaryCard({ run }: AlertRunSummaryCardProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="font-heading font-medium text-foreground text-sm">
        Resumo da execução
      </h3>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <SummaryMetric label="Status">
          <RunStatusValue status={run.status} />
        </SummaryMetric>
        <SummaryMetric label="Início">
          <span className="text-foreground">
            {formatDateTime(run.startedAt ?? run.createdAt)}
          </span>
        </SummaryMetric>
        <SummaryMetric
          label="Sucesso"
          valueClassName="font-semibold text-green-500"
        >
          {run.successCount}
        </SummaryMetric>
        <SummaryMetric
          label="Falhas"
          valueClassName="font-semibold text-destructive"
        >
          {run.failCount}
        </SummaryMetric>
      </div>
    </section>
  );
}

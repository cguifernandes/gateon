import { BadgeAlertIcon } from "@/components/icons/badge-alert";
import { CircleCheckIcon } from "@/components/icons/circle-check";
import { cn } from "@/lib/utils";
import type { AlertSummaryDto } from "@/lib/zod/alert-schemas";

type AlertCardMetricsProps = {
  alert: AlertSummaryDto;
};

export function AlertCardMetrics({ alert }: AlertCardMetricsProps) {
  const successCount = alert.lastRun?.successCount ?? 0;
  const failCount = alert.lastRun?.failCount ?? 0;

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 px-5 text-sm",
          alert.lastRunAt ? "pb-3" : "pb-5",
        )}
      >
        <span className="inline-flex items-center gap-1.5 font-medium text-green-500">
          <CircleCheckIcon
            size={16}
            animateOnHover={true}
            className="text-green-500"
          />
          {successCount}
          <span className="text-muted-foreground text-xs font-light">
            sucesso
          </span>
        </span>
        <span className="text-border text-xs font-light">|</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-300">
          <BadgeAlertIcon
            size={16}
            animateOnHover={true}
            className="text-amber-500"
          />
          {failCount}
          <span className="text-muted-foreground text-xs font-light">
            falhas
          </span>
        </span>
        <span className="text-border text-xs font-light">|</span>
        <span
          className={cn(
            "font-semibold",
            alert.deliveryRate >= 80
              ? "text-green-500"
              : alert.deliveryRate >= 60
                ? "text-amber-600 dark:text-amber-300"
                : "text-destructive",
          )}
        >
          {alert.deliveryRate}%
          <span className="text-muted-foreground text-xs font-light">
            {" "}
            entregas
          </span>
        </span>
      </div>
      {alert.lastRunAt ? (
        <div className="flex border-border border-t px-5 py-3">
          <span className="text-muted-foreground text-xs font-light">
            Última execução:{" "}
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date(alert.lastRunAt))}
          </span>
        </div>
      ) : null}
    </div>
  );
}

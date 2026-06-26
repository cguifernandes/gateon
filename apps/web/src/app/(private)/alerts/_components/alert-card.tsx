"use client";

import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
import { Badge } from "@/components/ui/badge";
import type { AlertAction } from "@/lib/alerts/actions";
import { cn } from "@/lib/utils";
import type { AlertSummaryDto } from "@/lib/zod/alert-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { AlertActionsToolbar } from "./alert-actions-toolbar";
import { AlertCardMessagePreview } from "./alert-card/alert-card-message-preview";
import { AlertCardMetrics } from "./alert-card/alert-card-metrics";

const destinationLabels = {
  GROUP: "Grupos",
  TOPIC: "Tópicos",
  MEMBERS: "Membros",
  QUICK_ALERT: "Aviso Rápido",
  AUTOMATION: "Automação",
} as const;

type AlertCardProps = {
  alert: AlertSummaryDto;
  groups: TelegramGroupSummaryDto[];
  onSelect?: (alert: AlertSummaryDto) => void;
  onActionSuccess?: (
    alertId: string,
    action: AlertAction,
  ) => void | Promise<void>;
};

export function AlertCard({
  alert,
  groups,
  onSelect,
  onActionSuccess,
}: AlertCardProps) {
  const isActive = alert.status === "ACTIVE";
  const isAutomation = alert.destinationType === "AUTOMATION";

  function handleCardActivate() {
    onSelect?.(alert);
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: card opens detail drawer; toolbar uses stopPropagation
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? handleCardActivate : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleCardActivate();
              }
            }
          : undefined
      }
      className={cn(
        "group relative flex h-fit w-full flex-col justify-between gap-6 rounded-xl border border-border bg-card text-left",
        "transition-all duration-200",
        "hover:border-primary/50 hover:bg-primary/5",
        isActive &&
          isAutomation &&
          "border-t-2 border-t-green-500 hover:border-t-green-500",
        onSelect &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3 p-5 pb-0">
        <div className="flex w-full min-w-0 flex-col gap-y-4">
          <div className="flex w-full min-w-0 flex-col gap-y-1">
            <div className="flex min-w-0 items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="inline-flex min-w-0 max-w-full overflow-hidden">
                  <TruncatedTextTooltip
                    text={alert.name}
                    variant="truncate"
                    className="min-w-0 w-max max-w-full font-heading font-semibold text-foreground"
                  />
                </span>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {destinationLabels[alert.destinationType]}
                  </Badge>
                </div>
              </div>

              <div
                className="shrink-0"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <AlertActionsToolbar
                  alertId={alert.id}
                  isActive={isActive}
                  isAutomation={isAutomation}
                  onActionSuccess={(action) =>
                    onActionSuccess?.(alert.id, action)
                  }
                />
              </div>
            </div>
          </div>

          <AlertCardMessagePreview alert={alert} groups={groups} />
        </div>
      </div>

      <AlertCardMetrics alert={alert} />
    </div>
  );
}

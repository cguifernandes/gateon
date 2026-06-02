"use client";

import { useMemo, useRef } from "react";
import { LoaderIcon } from "@/components/icons/loader";
import { XIcon, type XIconHandle } from "@/components/icons/x";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type AlertRunRecordDto,
  type AlertSummaryDto,
  resolveAlertTriggerLabel,
} from "@/lib/zod/alert-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { useAlertRunHistory } from "../_hooks/use-alert-run-history";
import { AlertRunErrorAccordion } from "./alert-detail/run-error-accordion";
import { buildAlertRunFailureGroups } from "./alert-detail/run-error-groups";
import { AlertRunSummaryCard } from "./alert-detail/run-summary-card";

const statusLabels = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  FAILED: "Falhou",
} as const;

const destinationLabels = {
  GROUP: "Grupos",
  TOPIC: "Tópicos",
  MEMBERS: "Membros",
  QUICK_ALERT: "Aviso Rápido",
  AUTOMATION: "Automação",
} as const;

type AlertDetailDrawerProps = {
  alert: AlertSummaryDto | null;
  groups: TelegramGroupSummaryDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatRunOptionLabel(run: AlertRunRecordDto) {
  const when = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(run.startedAt ?? run.createdAt));

  if (run.failCount > 0) {
    return `${when} - ${run.failCount} falha(s)`;
  }

  return `${when} - ${run.successCount} enviada(s)`;
}

function AlertDetailDrawerBadges({ alert }: { alert: AlertSummaryDto }) {
  const isActive = alert.status === "ACTIVE";
  const isAutomation = alert.destinationType === "AUTOMATION";
  const triggerLabel = alert.triggerType
    ? resolveAlertTriggerLabel(alert.triggerType)
    : null;

  const statusDotClassName =
    alert.status === "ACTIVE"
      ? "bg-green-500"
      : alert.status === "FAILED"
        ? "bg-destructive"
        : alert.status === "PAUSED"
          ? "bg-amber-400"
          : "bg-muted-foreground";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge
        variant="secondary"
        className={cn(
          "gap-1.5 border-border/80 bg-muted/60",
          isActive &&
            "border-green-800/40 bg-green-950/50 text-green-400 dark:border-green-800 dark:bg-green-950/80",
        )}
      >
        <span
          className={cn("size-2 shrink-0 rounded-full", statusDotClassName)}
          aria-hidden
        />
        {statusLabels[alert.status]}
      </Badge>

      <Badge variant="outline" className="border-border/80 bg-muted/30">
        {destinationLabels[alert.destinationType]}
      </Badge>

      {isAutomation && triggerLabel ? (
        <Badge variant="outline" className="border-border/80 bg-muted/30">
          {triggerLabel}
        </Badge>
      ) : null}

      <Badge variant="outline" className="border-border/80 bg-muted/30">
        {alert.deliveryRate}% de entrega
      </Badge>
    </div>
  );
}

export function AlertDetailDrawer({
  alert,
  groups,
  open,
  onOpenChange,
}: AlertDetailDrawerProps) {
  const xIconRef = useRef<XIconHandle>(null);
  const {
    runs,
    selectedRun,
    selectedRunId,
    setSelectedRunId,
    failedDeliveries,
    loadingRuns,
    loadingDeliveries,
    error,
  } = useAlertRunHistory(alert?.id ?? null, open, alert?.lastRun?.id);

  const isLoading = loadingRuns || loadingDeliveries;

  const failureGroups = useMemo(
    () => buildAlertRunFailureGroups(failedDeliveries, groups),
    [failedDeliveries, groups],
  );

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=right]:h-full data-[vaul-drawer-direction=right]:max-h-none data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-lg">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DrawerHeader className="relative shrink-0 border-b border-border p-0 text-left">
            <DrawerClose asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute top-4 right-4 size-8 shrink-0"
                aria-label="Fechar"
                onMouseEnter={() => xIconRef.current?.startAnimation()}
                onMouseLeave={() => xIconRef.current?.stopAnimation()}
              >
                <XIcon ref={xIconRef} size={16} isAnimateOnView={false} />
              </Button>
            </DrawerClose>

            <div className="flex flex-col gap-3 px-6 py-5 pr-16">
              <div className="space-y-1">
                <DrawerTitle className="font-heading text-xl">
                  Detalhes da Execução
                </DrawerTitle>
                <DrawerDescription>
                  Histórico de envios e alertas do bot
                </DrawerDescription>
              </div>
              {alert ? <AlertDetailDrawerBadges alert={alert} /> : null}
            </div>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            {!alert ? (
              <p className="text-muted-foreground text-center text-sm">
                Selecione um alerta para ver os detalhes.
              </p>
            ) : null}

            {alert && !loadingRuns && runs.length === 0 ? (
              <p className="rounded-xl border border-border bg-card/40 px-3 py-4 text-muted-foreground text-sm">
                Este alerta ainda não foi executado.
              </p>
            ) : null}

            {alert && runs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Execuções anteriores
                </p>
                <Select
                  value={selectedRunId ?? undefined}
                  onValueChange={setSelectedRunId}
                  disabled={loadingRuns}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma execução" />
                  </SelectTrigger>
                  <SelectContent>
                    {runs.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {formatRunOptionLabel(run)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <LoaderIcon size={18} />
                Carregando detalhes da execução…
              </div>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
                {error}
              </p>
            ) : null}

            {alert && selectedRun && !isLoading ? (
              <AlertRunSummaryCard run={selectedRun} />
            ) : null}

            {alert && selectedRun && !isLoading && !error ? (
              <AlertRunErrorAccordion failureGroups={failureGroups} />
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

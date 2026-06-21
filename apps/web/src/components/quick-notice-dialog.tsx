"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LoaderIcon } from "@/components/icons/loader";
import { SlidersHorizontalIcon } from "@/components/icons/sliders-horizontal";
import { QuickAlertSelectedDetails } from "@/components/quick-alert-selected-details";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { dispatchQuickAlertWithToast } from "@/lib/quick-alert-dispatch";
import {
  fetchQuickAlertOptions,
  getQuickAlertCardDescription,
  type QuickAlertOption,
} from "@/lib/quick-alerts";
import { cn } from "@/lib/utils";

export type QuickNoticeMemberTarget = {
  telegramUserId: string;
  displayName?: string;
};

export type QuickNoticePayload =
  | {
      type: "members";
      title: string;
      targets: QuickNoticeMemberTarget[];
    }
  | {
      type: "group";
      title: string;
      groupId: string;
    };

type QuickNoticeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: QuickNoticePayload | null;
  onSent?: () => void;
};

export function QuickNoticeDialog({
  open,
  onOpenChange,
  payload,
  onSent,
}: QuickNoticeDialogProps) {
  const [quickAlerts, setQuickAlerts] = useState<QuickAlertOption[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hasQuickAlerts = quickAlerts.length > 0;

  const selectedAlert = useMemo(
    () => quickAlerts.find((alert) => alert.id === selectedAlertId) ?? null,
    [quickAlerts, selectedAlertId],
  );

  useEffect(() => {
    if (!open || !payload) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setIsLoadingAlerts(true);
    setLoadError(null);
    setIsSubmitting(false);

    void fetchQuickAlertOptions(controller.signal).then((result) => {
      if (cancelled) return;

      setQuickAlerts(result.alerts);
      setLoadError(result.error);
      setIsLoadingAlerts(false);
      setSelectedAlertId((current) => {
        if (current && result.alerts.some((alert) => alert.id === current)) {
          return current;
        }
        return result.alerts[0]?.id ?? "";
      });
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, payload]);

  const summaryLabel = useMemo(() => {
    if (!payload) return "";
    if (payload.type === "members") {
      return `${payload.targets.length} membro${payload.targets.length === 1 ? "" : "s"}`;
    }
    return payload.title;
  }, [payload]);

  function handleClose() {
    onOpenChange(false);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      handleClose();
    }
  }

  async function handleSend() {
    if (!payload || !selectedAlert) return;

    setIsSubmitting(true);

    try {
      const result =
        payload.type === "members"
          ? await dispatchQuickAlertWithToast(
              selectedAlert.id,
              {
                targetType: "members",
                targets: payload.targets.map((target) => ({
                  telegramUserId: target.telegramUserId,
                  displayName: target.displayName,
                })),
              },
              {
                successMessage: `Aviso enviado para ${payload.targets.length} membro(s).`,
              },
            )
          : await dispatchQuickAlertWithToast(
              selectedAlert.id,
              {
                targetType: "group",
                telegramGroupId: payload.groupId,
              },
              { successMessage: "Aviso enviado para o grupo." },
            );

      if (!result.success) return;

      handleClose();
      onSent?.();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open || !payload) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="grid max-h-[600px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Aviso rápido</DialogTitle>
          <DialogDescription>
            {payload.type === "members" ? (
              <>
                Selecione um modelo para enviar a{" "}
                <span className="font-medium text-foreground">
                  {summaryLabel}
                </span>
                .
              </>
            ) : (
              <>
                Selecione um modelo para enviar no grupo{" "}
                <span className="font-medium text-foreground">
                  {summaryLabel}
                </span>
                .
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div
          className="min-h-0 overflow-y-auto overscroll-contain"
          onWheel={(event) => event.stopPropagation()}
        >
          {isLoadingAlerts ? (
            <div
              className="flex items-center justify-center gap-2 px-6 py-10 text-muted-foreground text-sm"
              aria-live="polite"
              aria-busy="true"
            >
              <LoaderIcon animateOnHover={false} size={20} />
              Carregando avisos rápidos…
            </div>
          ) : loadError ? (
            <div className="px-6 pb-4">
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm">
                {loadError}
              </p>
            </div>
          ) : hasQuickAlerts ? (
            <div className="space-y-4 px-6 pb-4">
              <Field>
                <FieldLabel>Modelo de aviso</FieldLabel>
                <RadioGroup
                  value={selectedAlertId}
                  onValueChange={(value) => {
                    if (value) setSelectedAlertId(value);
                  }}
                  className="max-h-40 gap-0 overflow-y-auto rounded-lg border border-border"
                >
                  {quickAlerts.map((alert, index) => {
                    const inputId = `quick-notice-alert-${alert.id}`;
                    const isSelected = selectedAlertId === alert.id;

                    return (
                      <FieldLabel
                        key={alert.id}
                        htmlFor={inputId}
                        className={cn(
                          "w-full cursor-pointer border-0 shadow-none",
                          "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:rounded-none has-[>[data-slot=field]]:border-0",
                          "hover:bg-muted/50",
                          isSelected && "bg-primary/5",
                          index > 0 && "border-border border-t",
                        )}
                      >
                        <Field
                          orientation="horizontal"
                          className="gap-3 px-3 py-2.5"
                        >
                          <RadioGroupItem value={alert.id} id={inputId} />
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div
                              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                              aria-hidden="true"
                            >
                              <SlidersHorizontalIcon
                                size={16}
                                isAnimateOnView={false}
                              />
                            </div>
                            <FieldContent>
                              <FieldTitle className="line-clamp-1 font-medium text-foreground! text-sm">
                                {alert.name}
                              </FieldTitle>
                              <FieldDescription className="line-clamp-2 text-muted-foreground text-xs">
                                {getQuickAlertCardDescription(alert)}
                              </FieldDescription>
                            </FieldContent>
                          </div>
                        </Field>
                      </FieldLabel>
                    );
                  })}
                </RadioGroup>
              </Field>

              {selectedAlert ? (
                <QuickAlertSelectedDetails alert={selectedAlert} />
              ) : null}
            </div>
          ) : (
            <div className="px-6 py-10">
              <p className="text-center text-sm text-muted-foreground">
                Nenhum aviso rápido disponível. Crie um alerta com destino{" "}
                <span className="font-medium text-foreground">
                  Aviso rápido
                </span>{" "}
                na página de{" "}
                <Link href="/alerts" className="text-primary underline">
                  Alertas
                </Link>{" "}
                para reutilizar aqui.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center w-full justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-40"
              onClick={handleClose}
            >
              {hasQuickAlerts && !isLoadingAlerts && !loadError
                ? "Cancelar"
                : "Fechar"}
            </Button>
            {hasQuickAlerts && !isLoadingAlerts && !loadError ? (
              <Button
                type="button"
                className="w-40"
                disabled={isSubmitting || !selectedAlert}
                onClick={handleSend}
              >
                {isSubmitting ? "Enviando..." : "Enviar aviso"}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

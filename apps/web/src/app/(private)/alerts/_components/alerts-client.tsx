"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SearchIcon, type SearchIconHandle } from "@/components/icons/search";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { matchesConnectedAtRange } from "@/lib/groups-filter";
import {
  type AlertSummaryDto,
  type AlertsResponseDto,
  alertsResponseSchema,
} from "@/lib/zod/alert-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { CreateAlertDialog } from "../../../../components/create-alert-dialog";
import { useAlertsFiltersUrl } from "../_hooks/use-alerts-filters-url";
import { AlertCard } from "./alert-card";
import { AlertDetailDrawer } from "./alert-detail-drawer";
import { AlertsEmptyState } from "./alerts-empty-state";
import { AlertsFiltersSidebar } from "./alerts-filters-sidebar";
import { StatCard } from "./stat-card";

type AlertsClientProps = {
  initialData: AlertsResponseDto;
  groups: TelegramGroupSummaryDto[];
};

function readRefreshAlertsError(body: unknown): string {
  if (body && typeof body === "object") {
    if (
      "error" in body &&
      typeof (body as { error?: unknown }).error === "string"
    ) {
      return (body as { error: string }).error;
    }
    if (
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
    ) {
      return (body as { message: string }).message;
    }
  }

  return "Não foi possível atualizar a lista de alertas.";
}

export function AlertsClient({ initialData, groups }: AlertsClientProps) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const { urlFilters, control: filtersControl } = useAlertsFiltersUrl();
  const [selectedAlert, setSelectedAlert] = useState<AlertSummaryDto | null>(
    null,
  );
  const searchIconRef = useRef<SearchIconHandle>(null);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredAlerts = useMemo(() => {
    return data.alerts.filter((alert) => {
      const matchesSearch =
        !normalizedQuery ||
        alert.name.toLowerCase().includes(normalizedQuery) ||
        (alert.internalTitle ?? "").toLowerCase().includes(normalizedQuery);
      const matchesGroup =
        urlFilters.groupId === "all" ||
        alert.telegramGroupId === urlFilters.groupId;
      const createdAt =
        typeof alert.createdAt === "string"
          ? alert.createdAt
          : alert.createdAt.toISOString();
      const matchesDate = matchesConnectedAtRange(
        createdAt,
        urlFilters.createdRange,
      );
      const matchesStatus =
        urlFilters.status === "all" || alert.status === urlFilters.status;
      const matchesDestination =
        urlFilters.destination === "all" ||
        alert.destinationType === urlFilters.destination;

      return (
        matchesSearch &&
        matchesGroup &&
        matchesDate &&
        matchesStatus &&
        matchesDestination
      );
    });
  }, [data.alerts, normalizedQuery, urlFilters]);

  const refreshAlerts = useCallback(async () => {
    try {
      const response = await fetch("/api/alerts", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Falha ao atualizar alertas", {
          description: readRefreshAlertsError(body),
        });
        return;
      }

      const parsed = alertsResponseSchema.safeParse(body);
      if (!parsed.success) {
        toast.error("Falha ao atualizar alertas", {
          description: "A resposta da API veio em formato inválido.",
        });
        return;
      }

      setData(parsed.data);
      setSelectedAlert((current) => {
        if (!current) return current;
        return (
          parsed.data.alerts.find((alert) => alert.id === current.id) ?? null
        );
      });
    } catch {
      toast.error("Falha ao atualizar alertas", {
        description: "Verifique sua conexão e tente novamente.",
      });
    }
  }, []);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 bg-linear-to-br from-card via-card to-primary/30 p-6">
          <Badge variant="outline">Automação Telegram</Badge>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading font-extrabold text-3xl leading-[1.08] tracking-tight text-foreground">
              Central de Alertas
            </h1>
            <p className="max-w-2xl font-light text-muted-foreground text-sm">
              Crie avisos automáticos e campanhas administrativas para seus
              grupos e membros.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          key={`active-${data.stats.activeCount}`}
          title="Alertas ativos"
          value={data.stats.activeCount.toString()}
          description="Alertas publicados e prontos para disparo manual ou por automação."
        />
        <StatCard
          key={`sent-${data.stats.sentToday}`}
          title="Enviadas hoje"
          value={data.stats.sentToday.toString()}
          description="Mensagens que o bot entregou com sucesso no dia de hoje."
        />
        <StatCard
          key={`rate-${data.stats.deliveryRate}`}
          title="Taxa de entrega"
          value={data.stats.deliveryRate.toString()}
          suffix="%"
          description="Percentual de sucesso nas execuções de envio registradas hoje."
        />
        <StatCard
          key={`draft-${data.stats.draftCount}`}
          title="Rascunhos"
          value={data.stats.draftCount.toString()}
          description="Alertas guardados como rascunho e que ainda não foram publicados."
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-md flex-1">
            <SearchIcon
              ref={searchIconRef}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              placeholder="Pesquisar por nome do alerta"
              type="search"
              value={query}
              className="pl-9"
              onFocus={() => searchIconRef.current?.startAnimation()}
              onBlur={() => searchIconRef.current?.stopAnimation()}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <CreateAlertDialog groups={groups} onCreated={refreshAlerts} />
        </div>
        <div className="grid gap-4 lg:grid-cols-[295px_1fr]">
          <AlertsFiltersSidebar groups={groups} control={filtersControl} />

          <div className="min-w-0">
            {filteredAlerts.length > 0 ? (
              <div className="columns-1 gap-4 space-y-4 xl:columns-2">
                {filteredAlerts.map((alert) => (
                  <div key={alert.id} className="break-inside-avoid">
                    <AlertCard
                      alert={alert}
                      groups={groups}
                      onSelect={setSelectedAlert}
                      onActionSuccess={() => void refreshAlerts()}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <AlertsEmptyState
                hasNoAlerts={data.alerts.length === 0}
                searchQuery={query}
                hasActiveUrlFilters={filtersControl.appliedActiveCount > 0}
                groups={groups}
                onCreated={refreshAlerts}
                onClearFilters={filtersControl.clear}
              />
            )}
          </div>
        </div>
      </div>

      <AlertDetailDrawer
        alert={selectedAlert}
        groups={groups}
        open={selectedAlert !== null}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
      />
    </>
  );
}

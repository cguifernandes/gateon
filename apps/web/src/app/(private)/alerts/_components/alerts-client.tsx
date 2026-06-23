"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/data-table-pagination";
import { SearchIcon, type SearchIconHandle } from "@/components/icons/search";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  toClientPaginationState,
  useServerPaginationFetch,
} from "@/hooks/use-server-pagination-fetch";
import { buildAlertsListSearchParams } from "@/lib/build-alerts-list-search-params";
import { cn } from "@/lib/utils";
import {
  type AlertSummaryDto,
  type AlertsResponseDto,
  alertsResponseSchema,
} from "@/lib/zod/alert-schemas";
import type { StripeBillingConnectionDto } from "@/lib/zod/stripe-billing-schemas";
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
  stripeConnections: StripeBillingConnectionDto[];
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

export function AlertsClient({
  initialData,
  groups,
  stripeConnections,
}: AlertsClientProps) {
  const [query, setQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { urlFilters, control: filtersControl } = useAlertsFiltersUrl();
  const [selectedAlert, setSelectedAlert] = useState<AlertSummaryDto | null>(
    null,
  );
  const [editingAlert, setEditingAlert] = useState<AlertSummaryDto | null>(
    null,
  );
  const searchIconRef = useRef<SearchIconHandle>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(query.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const fetchPage = useCallback(
    async (page: number) => {
      const params = buildAlertsListSearchParams({
        page,
        search: debouncedSearch,
        urlFilters,
      });
      const response = await fetch(`/api/alerts?${params.toString()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!response.ok) {
        return null;
      }

      const parsed = alertsResponseSchema.safeParse(await response.json());
      return parsed.success ? parsed.data : null;
    },
    [debouncedSearch, urlFilters],
  );

  const { data, setPage, isLoading, reload } =
    useServerPaginationFetch<AlertsResponseDto>({
      fetchPage,
      resetKey: `${debouncedSearch}:${JSON.stringify(urlFilters)}`,
      initialData,
      initialPage: initialData.pagination.page,
    });

  const alerts = data?.alerts ?? initialData.alerts;
  const stats = data?.stats ?? initialData.stats;
  const pagination = toClientPaginationState(
    data?.pagination ?? initialData.pagination,
    setPage,
  );

  const refreshAlerts = useCallback(async () => {
    try {
      await reload();
    } catch {
      toast.error("Falha ao atualizar alertas", {
        description: "Verifique sua conexão e tente novamente.",
      });
    }
  }, [reload]);

  const hasNoAlerts =
    initialData.pagination.totalItems === 0 &&
    filtersControl.appliedActiveCount === 0 &&
    debouncedSearch.length === 0;

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
          key={`active-${stats.activeCount}`}
          title="Automações ativas"
          value={stats.activeCount.toString()}
          description="Automações publicadas e prontas para disparo por eventos do grupo."
        />
        <StatCard
          key={`sent-${stats.sentToday}`}
          title="Enviadas hoje"
          value={stats.sentToday.toString()}
          description="Mensagens que o bot entregou com sucesso no dia de hoje."
        />
        <StatCard
          key={`rate-${stats.deliveryRate}`}
          title="Taxa de entrega"
          value={stats.deliveryRate.toString()}
          suffix="%"
          description="Percentual de sucesso nas execuções de envio registradas hoje."
        />
        <StatCard
          key={`draft-${stats.draftCount}`}
          title="Rascunhos"
          value={stats.draftCount.toString()}
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
          <CreateAlertDialog
            groups={groups}
            stripeConnections={stripeConnections}
            onCreated={refreshAlerts}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-[295px_1fr]">
          <AlertsFiltersSidebar groups={groups} control={filtersControl} />

          <div className="min-w-0">
            {pagination.totalItems > 0 ? (
              <div
                className={cn("flex flex-col gap-4", isLoading && "opacity-60")}
              >
                <div className="columns-1 gap-4 space-y-4 xl:columns-2">
                  {alerts.map((alert) => (
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
                <DataTablePagination
                  pagination={pagination}
                  itemLabel="alerta"
                  itemLabelPlural="alertas"
                />
              </div>
            ) : (
              <AlertsEmptyState
                hasNoAlerts={hasNoAlerts}
                searchQuery={query}
                hasActiveUrlFilters={filtersControl.appliedActiveCount > 0}
                groups={groups}
                stripeConnections={stripeConnections}
                onCreated={refreshAlerts}
                onClearFilters={filtersControl.clear}
              />
            )}
          </div>
        </div>
      </div>

      {editingAlert === null ? (
        <AlertDetailDrawer
          alert={selectedAlert}
          groups={groups}
          open={selectedAlert !== null}
          onOpenChange={(open) => !open && setSelectedAlert(null)}
          onEdit={(alert) => {
            setEditingAlert(alert);
            setSelectedAlert(null);
          }}
          onDeleted={() => {
            setSelectedAlert(null);
            setEditingAlert(null);
            void refreshAlerts();
          }}
        />
      ) : null}

      <CreateAlertDialog
        groups={groups}
        stripeConnections={stripeConnections}
        alertToEdit={editingAlert}
        open={editingAlert !== null}
        onOpenChange={(open) => {
          if (!open) setEditingAlert(null);
        }}
        onCreated={() => {
          setSelectedAlert(null);
          void refreshAlerts();
        }}
        showTrigger={false}
      />
    </>
  );
}

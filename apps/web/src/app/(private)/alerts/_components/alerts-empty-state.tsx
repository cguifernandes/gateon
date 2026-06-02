import { BadgeAlertIcon } from "@/components/icons/badge-alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { CreateAlertDialog } from "../../../../components/create-alert-dialog";

type AlertsEmptyStateProps = {
  hasNoAlerts: boolean;
  searchQuery: string;
  hasActiveUrlFilters: boolean;
  groups: TelegramGroupSummaryDto[];
  onCreated: () => void;
  onClearFilters: () => void;
};

export function AlertsEmptyState({
  hasNoAlerts,
  searchQuery,
  hasActiveUrlFilters,
  groups,
  onCreated,
  onClearFilters,
}: AlertsEmptyStateProps) {
  const hasActiveSearch = searchQuery.trim().length > 0;
  const isSearchOnlyEmpty =
    !hasNoAlerts && hasActiveSearch && !hasActiveUrlFilters;
  const isFiltersOnlyEmpty =
    !hasNoAlerts && !hasActiveSearch && hasActiveUrlFilters;
  const isCombinedEmpty =
    !hasNoAlerts && hasActiveSearch && hasActiveUrlFilters;

  return (
    <Empty className="rounded-xl border border-border">
      <EmptyHeader>
        <EmptyMedia
          className={
            hasNoAlerts
              ? "size-14 rounded-lg bg-primary/15 ring-1 ring-primary/25"
              : "size-14 rounded-lg bg-muted"
          }
        >
          <BadgeAlertIcon className="text-primary" size={24} />
        </EmptyMedia>
        {hasNoAlerts ? (
          <>
            <EmptyTitle>Nenhum alerta criado</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Crie seu primeiro alerta para enviar mensagens a grupos, tópicos,
              membros ou automatizar avisos quando algo acontecer no Telegram.
            </EmptyDescription>
          </>
        ) : isSearchOnlyEmpty ? (
          <>
            <EmptyTitle>Nenhum resultado na busca</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Não encontramos alertas para &quot;{searchQuery.trim()}&quot;.
              Tente outro nome ou limpe a busca para ver todos.
            </EmptyDescription>
          </>
        ) : isFiltersOnlyEmpty || isCombinedEmpty ? (
          <>
            <EmptyTitle>Nenhum alerta com esses filtros</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              {isCombinedEmpty
                ? "Nenhum alerta corresponde à busca e aos filtros aplicados. Ajuste ou limpe para ver todos."
                : "Nenhum alerta corresponde ao status, destino, grupo ou período escolhidos. Ajuste os filtros ou limpe para ver todos."}
            </EmptyDescription>
          </>
        ) : (
          <>
            <EmptyTitle>Nenhum alerta encontrado</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Ajuste a busca ou os filtros para ver mais resultados.
            </EmptyDescription>
          </>
        )}
      </EmptyHeader>
      <EmptyContent className="flex flex-wrap justify-center gap-2">
        {hasActiveUrlFilters ? (
          <Button type="button" variant="outline" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        ) : null}
        {hasNoAlerts ? (
          <CreateAlertDialog groups={groups} onCreated={onCreated} />
        ) : null}
      </EmptyContent>
    </Empty>
  );
}

"use client";

import { SearchIcon } from "@/components/icons/search";
import { SlidersHorizontalIcon } from "@/components/icons/sliders-horizontal";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { TableResultsEmptyKind } from "@/lib/resolve-table-empty-state";
import { cn } from "@/lib/utils";

type TableResultsResource = "groups" | "members" | "alerts";

type TableResultsEmptyStateProps = {
  kind: TableResultsEmptyKind;
  resource: TableResultsResource;
  embedded?: boolean;
  className?: string;
  isRefreshing?: boolean;
  onClearSearch?: () => void;
  onClearFilters?: () => void;
};

const COPY: Record<
  TableResultsResource,
  Record<TableResultsEmptyKind, { title: string; description: string }>
> = {
  groups: {
    search: {
      title: "Nenhum resultado na busca",
      description:
        "Não encontramos grupos para sua pesquisa. Tente outro nome ou ID do chat.",
    },
    filters: {
      title: "Nenhum grupo com esses filtros",
      description:
        "Nenhum grupo corresponde ao status do bot ou ao período de conexão escolhidos. Ajuste os filtros ou limpe para ver todos.",
    },
  },
  members: {
    search: {
      title: "Nenhum resultado na busca",
      description:
        "Não encontramos membros ou grupos para sua pesquisa. Tente outro nome ou ID.",
    },
    filters: {
      title: "Nenhum membro com esses filtros",
      description:
        "Nenhum membro corresponde ao status, grupo ou período escolhidos. Ajuste os filtros ou limpe para ver todos.",
    },
  },
  alerts: {
    search: {
      title: "Nenhum resultado na busca",
      description:
        "Não encontramos alertas para sua pesquisa. Tente outro nome ou limpe a busca para ver todos.",
    },
    filters: {
      title: "Nenhum alerta com esses filtros",
      description:
        "Nenhum alerta corresponde ao status, destino, grupo ou período escolhidos. Ajuste os filtros ou limpe para ver todos.",
    },
  },
};

export function TableResultsEmptyState({
  kind,
  resource,
  embedded = true,
  className,
  isRefreshing = false,
  onClearSearch,
  onClearFilters,
}: TableResultsEmptyStateProps) {
  const copy = COPY[resource][kind];
  const Icon = kind === "search" ? SearchIcon : SlidersHorizontalIcon;

  return (
    <Empty
      className={cn(
        embedded
          ? "border-0 bg-background py-10"
          : "rounded-xl border border-border",
        className,
      )}
      aria-live="polite"
      aria-busy={isRefreshing}
    >
      <EmptyHeader>
        <EmptyMedia className="size-14 rounded-lg bg-muted">
          <Icon className="text-primary" size={24} />
        </EmptyMedia>
        <EmptyTitle>{copy.title}</EmptyTitle>
        <EmptyDescription className="max-w-sm text-pretty">
          {copy.description}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex flex-wrap justify-center gap-2">
        {kind === "search" && onClearSearch ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearSearch}
          >
            Limpar busca
          </Button>
        ) : null}
        {kind === "filters" && onClearFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearFilters}
          >
            Limpar filtros
          </Button>
        ) : null}
      </EmptyContent>
    </Empty>
  );
}

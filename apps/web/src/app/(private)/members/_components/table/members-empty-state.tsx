"use client";

import { AddGroupBotDialog } from "@/components/add-group-bot-dialog-dynamic";
import { UsersIcon } from "@/components/icons/users";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type MembersEmptyStateProps = {
  hasNoGroups: boolean;
  hasNoMembers: boolean;
  isSearchEmpty: boolean;
  isPopoverFilterEmpty?: boolean;
  embedded?: boolean;
  onClearSearch: () => void;
  onClearPopoverFilters?: () => void;
  className?: string;
};

export function MembersEmptyState({
  hasNoGroups,
  hasNoMembers,
  isSearchEmpty,
  isPopoverFilterEmpty = false,
  embedded = false,
  onClearSearch,
  onClearPopoverFilters,
  className,
}: MembersEmptyStateProps) {
  return (
    <Empty
      className={cn(
        embedded ? "border-0 py-10" : "rounded-md border border-border",
        className,
      )}
    >
      <EmptyHeader>
        <EmptyMedia className="size-14 rounded-lg">
          <UsersIcon className="text-primary" size={24} />
        </EmptyMedia>

        {hasNoGroups ? (
          <>
            <EmptyTitle>Nenhum grupo conectado</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Use o botão &quot;Conectar um grupo&quot; para vincular seu
              primeiro grupo do Telegram. Os membros rastreados aparecerão aqui
              quando o bot registrar entradas.
            </EmptyDescription>
          </>
        ) : isSearchEmpty ? (
          <>
            <EmptyTitle>Nenhum resultado na busca</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Não encontramos membros ou grupos para sua pesquisa. Tente outro
              nome ou ID.
            </EmptyDescription>
          </>
        ) : isPopoverFilterEmpty ? (
          <>
            <EmptyTitle>Nenhum membro com esses filtros</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Nenhum membro corresponde ao status, grupo ou período escolhidos.
              Ajuste os filtros ou limpe para ver todos.
            </EmptyDescription>
          </>
        ) : hasNoMembers ? (
          <>
            <EmptyTitle>Nenhum membro rastreado</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Os membros aparecem aqui quando o bot registra entradas nos grupos
              conectados.
            </EmptyDescription>
          </>
        ) : null}
      </EmptyHeader>

      <EmptyContent className="flex flex-wrap justify-center gap-2">
        {isSearchEmpty ? (
          <Button type="button" variant="outline" onClick={onClearSearch}>
            Limpar busca
          </Button>
        ) : null}
        {isPopoverFilterEmpty && onClearPopoverFilters ? (
          <Button
            type="button"
            variant="outline"
            onClick={onClearPopoverFilters}
          >
            Limpar filtros
          </Button>
        ) : null}
        {hasNoGroups ? <AddGroupBotDialog /> : null}
      </EmptyContent>
    </Empty>
  );
}

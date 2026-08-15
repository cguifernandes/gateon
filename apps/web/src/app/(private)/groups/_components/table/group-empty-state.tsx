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

type GroupsEmptyStateProps = {
  hasNoGroups: boolean;
  isSearchEmpty: boolean;
  isPopoverFilterEmpty: boolean;
  embedded?: boolean;
  onClearSearch: () => void;
  onClearPopoverFilters: () => void;
};

export function GroupsEmptyState({
  hasNoGroups,
  isSearchEmpty,
  isPopoverFilterEmpty,
  embedded = false,
  onClearSearch,
  onClearPopoverFilters,
}: GroupsEmptyStateProps) {
  const isNoGroupsFullPage = hasNoGroups && !embedded;

  return (
    <Empty
      className={
        isNoGroupsFullPage
          ? "w-full border-0"
          : embedded
            ? "border-0 bg-background py-10"
            : "rounded-md border border-border"
      }
    >
      <EmptyHeader>
        <EmptyMedia className={cn("size-14 rounded-lg")}>
          <UsersIcon className="text-primary" size={24} />
        </EmptyMedia>
        {hasNoGroups ? (
          <>
            <EmptyTitle>Nenhum grupo conectado</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Use o botão &quot;Cadastrar um grupo&quot; para vincular seu
              primeiro grupo do Telegram. O Gateon cuidará de membros e
              assinaturas por você.
            </EmptyDescription>
          </>
        ) : isSearchEmpty ? (
          <>
            <EmptyTitle>Nenhum resultado na busca</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Não encontramos grupos para sua pesquisa. Tente outro nome ou ID
              do chat.
            </EmptyDescription>
          </>
        ) : (
          <>
            <EmptyTitle>Nenhum grupo com esses filtros</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Nenhum grupo corresponde ao status do bot ou ao período de conexão
              escolhidos. Ajuste os filtros ou limpe para ver todos.
            </EmptyDescription>
          </>
        )}
      </EmptyHeader>
      {(isSearchEmpty || isPopoverFilterEmpty) && (
        <EmptyContent className="flex flex-wrap justify-center gap-2">
          {isSearchEmpty ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearSearch}
            >
              Limpar busca
            </Button>
          ) : null}
          {isPopoverFilterEmpty ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearPopoverFilters}
            >
              Limpar filtros
            </Button>
          ) : null}
        </EmptyContent>
      )}
    </Empty>
  );
}

import { AddGroupBotDialog } from "@/components/add-group-bot-dialog";
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
          ? ""
          : embedded
            ? "border-0 bg-background py-10"
            : "rounded-xl border border-border"
      }
    >
      <EmptyHeader>
        <EmptyMedia
          className={cn(
            "size-14 rounded-lg",
            isNoGroupsFullPage
              ? "bg-primary/15 ring-1 ring-primary/25"
              : "bg-muted",
          )}
        >
          <UsersIcon className="text-primary" size={24} />
        </EmptyMedia>
        {hasNoGroups ? (
          <>
            <EmptyTitle>Nenhum grupo conectado</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Use o botão &quot;Cadastrar um novo&quot; para vincular seu
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
      <EmptyContent className="flex flex-wrap justify-center gap-2">
        {isSearchEmpty ? (
          <Button type="button" variant="outline" onClick={onClearSearch}>
            Limpar busca
          </Button>
        ) : null}
        {isPopoverFilterEmpty ? (
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

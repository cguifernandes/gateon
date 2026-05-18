"use client";

import { SettingsIcon } from "lucide-react";
import { useMemo, useRef } from "react";
import { AddGroupBotDialog } from "@/components/add-group-bot-dialog";
import { SearchIcon, type SearchIconHandle } from "@/components/icons/search";
import { UsersIcon } from "@/components/icons/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { matchesConnectedAtRange } from "@/lib/groups-filter";
import {
  getBotStatusDisplay,
  matchesBotStatusFilter,
} from "@/lib/telegram-bot-status";
import { cn } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { useGroupsFiltersUrl } from "../_hooks/use-groups-filters-url";
import { GroupsFiltersPopover } from "./groups-filters-popover";
import { RemoveGroupDialog } from "./remove-group-dialog";

function formatTelegramMemberName(
  member: TelegramGroupSummaryDto["connectedBy"],
) {
  if (!member) return "—";
  const fullName = [member.firstName, member.lastName]
    .filter(Boolean)
    .join(" ");
  if (fullName) return fullName;
  return member.username ? `@${member.username}` : member.telegramUserId;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

type GroupsEmptyStateProps = {
  hasNoGroups: boolean;
  isSearchEmpty: boolean;
  isPopoverFilterEmpty: boolean;
  embedded?: boolean;
  onClearSearch: () => void;
  onClearPopoverFilters: () => void;
};

function GroupsEmptyState({
  hasNoGroups,
  isSearchEmpty,
  isPopoverFilterEmpty,
  embedded = false,
  onClearSearch,
  onClearPopoverFilters,
}: GroupsEmptyStateProps) {
  return (
    <Empty
      className={
        embedded
          ? "border-0 py-10"
          : "rounded-xl border border-border border-dashed"
      }
    >
      <EmptyHeader>
        <EmptyMedia className="bg-muted size-14 rounded-lg">
          <UsersIcon className="text-primary" size={24} />
        </EmptyMedia>
        {hasNoGroups ? (
          <>
            <EmptyTitle>Nenhum grupo conectado</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Use o botão &quot;Cadastrar um novo&quot; no topo da página para
              vincular seu primeiro grupo do Telegram. O Gateon cuidará de
              membros e assinaturas por você.
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

type GroupsTableProps = {
  groups: TelegramGroupSummaryDto[];
};

export function GroupsTable({ groups }: GroupsTableProps) {
  const {
    search,
    setSearch,
    botStatusFilter,
    setBotStatusFilter,
    connectedRange,
    setConnectedRange,
    clearPopoverFilters,
    clearSearch,
  } = useGroupsFiltersUrl();
  const searchIconRef = useRef<SearchIconHandle>(null);

  const hasPopoverFilters =
    botStatusFilter !== "all" || connectedRange?.from !== undefined;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      const matchesSearch =
        !q ||
        (g.title ?? "").toLowerCase().includes(q) ||
        g.telegramChatId.toLowerCase().includes(q);
      const matchesStatus = matchesBotStatusFilter(
        g.botStatus,
        botStatusFilter,
      );
      const matchesConnected = matchesConnectedAtRange(
        g.connectedAt,
        connectedRange,
      );
      return matchesSearch && matchesStatus && matchesConnected;
    });
  }, [groups, search, botStatusFilter, connectedRange]);

  const hasNoGroups = groups.length === 0;
  const hasActiveSearch = search.trim().length > 0;
  const isSearchEmpty =
    !hasNoGroups && filtered.length === 0 && hasActiveSearch;
  const isPopoverFilterEmpty =
    !hasNoGroups &&
    filtered.length === 0 &&
    !hasActiveSearch &&
    hasPopoverFilters;

  return (
    <>
      {hasNoGroups ? (
        <GroupsEmptyState
          hasNoGroups
          isPopoverFilterEmpty={false}
          isSearchEmpty={false}
          onClearPopoverFilters={clearPopoverFilters}
          onClearSearch={clearSearch}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-md flex-1">
              <SearchIcon
                ref={searchIconRef}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <Input
                placeholder="Pesquisar por nome ou ID do grupo"
                type="search"
                value={search}
                className="pl-9"
                onFocus={() => searchIconRef.current?.startAnimation()}
                onBlur={() => searchIconRef.current?.stopAnimation()}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <GroupsFiltersPopover
              botStatus={botStatusFilter}
              onBotStatusChange={setBotStatusFilter}
              connectedRange={connectedRange}
              onConnectedRangeChange={setConnectedRange}
              onClearFilters={clearPopoverFilters}
            />
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[220px] pl-4">Grupo</TableHead>
                  <TableHead>Status do bot</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Gateway
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Conectado
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Conectado por
                  </TableHead>
                  <TableHead className="w-[100px] pr-4 text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((group) => {
                  const botDisplay = getBotStatusDisplay(group.botStatus);

                  return (
                    <TableRow
                      className="group/row transition-colors"
                      key={group.id}
                    >
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {group.title || "Grupo sem nome"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-6 gap-1.5 border px-2 text-xs font-medium",
                            botDisplay.className,
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              botDisplay.dotClassName,
                            )}
                          />
                          {botDisplay.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground tabular-nums">
                            {group.memberCount ?? "—"}
                          </span>
                          {group.memberCount !== null ? (
                            <span className="text-xs text-muted-foreground">
                              membros
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <Badge
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          Não conectado
                        </Badge>
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatDate(group.connectedAt)}
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatTelegramMemberName(group.connectedBy)}
                      </TableCell>

                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            className="size-8 text-muted-foreground hover:text-foreground"
                            size="icon"
                            title="Configurar grupo"
                            variant="ghost"
                          >
                            <SettingsIcon size={15} />
                            <span className="sr-only">Configurar</span>
                          </Button>

                          <RemoveGroupDialog
                            groupId={group.id}
                            groupTitle={group.title ?? ""}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filtered.length === 0 ? (
                  <TableRow className="hover:bg-background">
                    <TableCell colSpan={7} className="p-0">
                      <GroupsEmptyState
                        embedded
                        hasNoGroups={false}
                        isPopoverFilterEmpty={isPopoverFilterEmpty}
                        isSearchEmpty={isSearchEmpty}
                        onClearPopoverFilters={clearPopoverFilters}
                        onClearSearch={clearSearch}
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {groups.length > 1 &&
        (filtered.length > 0 || hasActiveSearch || hasPopoverFilters) && (
          <p className="text-center text-xs text-muted-foreground">
            Exibindo{" "}
            <strong className="font-medium text-foreground">
              {filtered.length}
            </strong>{" "}
            de{" "}
            <strong className="font-medium text-foreground">
              {groups.length}
            </strong>{" "}
            grupo{groups.length !== 1 ? "s" : ""}
          </p>
        )}
    </>
  );
}

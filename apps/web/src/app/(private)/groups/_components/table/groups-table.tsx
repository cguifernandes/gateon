"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TelegramGroupTypeCell } from "@/app/(private)/groups/_components/table/telegram-group-type-badges";
import StripeIcon from "@/assets/gateway/stripe-4.svg";
import { AddGroupBotDialog } from "@/components/add-group-bot-dialog";
import { SearchIcon, type SearchIconHandle } from "@/components/icons/search";
import { UsersIcon } from "@/components/icons/users";
import { ImageComponent } from "@/components/image-component";
import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
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
import { Progress } from "@/components/ui/progress";
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
import { cn, withCacheBuster } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { useGroupsFiltersUrl } from "../../_hooks/use-groups-filters-url";
import { GroupsFiltersPopover } from "../groups-filters-popover";
import { GroupMembersDrawer } from "./group-members-drawer";
import { GroupRowActionsMenu } from "./group-row-actions-menu";

function memberMatchesSearch(
  members: TelegramGroupSummaryDto["members"],
  q: string,
) {
  if (!q) return false;
  return members.some((m) => {
    const hay = [m.firstName, m.lastName, m.username, m.telegramUserId]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

function getTrackedMembersProgressPercent(
  tracked: number,
  limit: number,
): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((tracked / limit) * 100));
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
        embedded ? "border-0 py-10" : "rounded-xl border border-border"
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
  const [membersDrawerGroup, setMembersDrawerGroup] =
    useState<TelegramGroupSummaryDto | null>(null);

  useEffect(() => {
    if (!membersDrawerGroup) {
      return;
    }
    const fresh = groups.find((g) => g.id === membersDrawerGroup.id);
    if (fresh) {
      setMembersDrawerGroup(fresh);
    }
  }, [groups, membersDrawerGroup?.id]);

  const hasPopoverFilters =
    botStatusFilter !== "all" || connectedRange?.from !== undefined;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      const matchesSearch =
        !q ||
        (g.title ?? "").toLowerCase().includes(q) ||
        g.telegramChatId.toLowerCase().includes(q) ||
        memberMatchesSearch(g.members, q);
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
            <div className="flex w-full items-center gap-3">
              <div className="relative max-w-sm flex-1">
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
            <AddGroupBotDialog />
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-xs">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted/40">
                  <TableHead className="w-full">Grupo</TableHead>
                  <TableHead className="w-[220px]">Membros</TableHead>
                  <TableHead className="hidden w-28 whitespace-nowrap px-2 text-center sm:table-cell">
                    Tipo
                  </TableHead>
                  <TableHead className="hidden w-28 whitespace-nowrap px-2 text-center lg:table-cell">
                    Gateway
                  </TableHead>
                  <TableHead className="hidden w-28 whitespace-nowrap px-2 text-center md:table-cell">
                    Conectado em
                  </TableHead>
                  <TableHead className="w-28 whitespace-nowrap px-2 text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-16 px-2 text-center">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((group) => {
                  const botDisplay = getBotStatusDisplay(group.botStatus);

                  return (
                    <TableRow
                      className="group/row cursor-pointer transition-colors hover:bg-muted/50"
                      key={group.id}
                      onClick={() => setMembersDrawerGroup(group)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setMembersDrawerGroup(group);
                        }
                      }}
                      tabIndex={0}
                      aria-label={`Ver membros de ${group.title ?? "grupo"}`}
                    >
                      <TableCell className="w-92 align-top">
                        <div className="flex min-w-0 gap-3">
                          {group.chatPhotoUrl && (
                            <ImageComponent
                              src={withCacheBuster(
                                group.chatPhotoUrl,
                                group.updatedAt,
                              )}
                              alt={group.title ?? "Foto do grupo"}
                              width={38}
                              height={38}
                              sizes="38px"
                              className="size-[38px] shrink-0 rounded-md border border-border object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <TruncatedTextTooltip
                              text={group.title ?? "Sem título"}
                              variant="truncate"
                              className="font-heading font-medium leading-tight text-foreground"
                            />
                            <span className="text-xs text-muted-foreground">
                              {group.telegramChatId}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="w-[220px]">
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex items-baseline justify-between gap-1 text-[11px]">
                            <span className="text-muted-foreground">
                              Gerenciados neste grupo
                            </span>
                            <span
                              className={cn(
                                "shrink-0 font-medium tabular-nums",
                                group.trackedMemberLimitReached
                                  ? "text-amber-600 dark:text-amber-500"
                                  : "text-foreground",
                              )}
                            >
                              {group.trackedMemberCount} /{" "}
                              {group.trackedMemberLimitPerGroup}
                            </span>
                          </div>
                          <Progress
                            value={getTrackedMembersProgressPercent(
                              group.trackedMemberCount,
                              group.trackedMemberLimitPerGroup,
                            )}
                            className={cn(
                              "w-full flex-nowrap gap-0",
                              group.trackedMemberLimitReached &&
                                "**:data-[slot=progress-indicator]:bg-amber-500",
                            )}
                            aria-label={`Membros gerenciados neste grupo: ${group.trackedMemberCount} de ${group.trackedMemberLimitPerGroup}`}
                          />
                        </div>
                      </TableCell>

                      <TableCell className="hidden w-36 align-middle sm:table-cell">
                        <TelegramGroupTypeCell
                          type={group.type}
                          isForum={group.isForum}
                        />
                      </TableCell>

                      <TableCell className="hidden w-28 text-center whitespace-nowrap lg:table-cell">
                        <ImageComponent
                          src={StripeIcon.src}
                          alt="Stripe"
                          width={32}
                          height={32}
                          sizes="32px"
                          className="size-[32px] shrink-0"
                        />
                      </TableCell>

                      <TableCell className="hidden w-36 text-center whitespace-nowrap align-middle md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(group.connectedAt)}
                        </span>
                      </TableCell>

                      <TableCell className="w-28 text-center whitespace-nowrap align-middle">
                        <Badge
                          variant="outline"
                          className={cn(
                            "w-max shrink-0 gap-1.5 text-xs font-medium whitespace-nowrap",
                            botDisplay.className,
                          )}
                        >
                          {botDisplay.label}
                        </Badge>
                      </TableCell>

                      <TableCell
                        className="w-16 px-1 text-center align-middle"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <div className="flex justify-center">
                          <GroupRowActionsMenu
                            groupId={group.id}
                            groupTitle={group.title ?? ""}
                            onViewMembers={() => setMembersDrawerGroup(group)}
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

          {membersDrawerGroup ? (
            <GroupMembersDrawer
              group={membersDrawerGroup}
              open
              showTrigger={false}
              onOpenChange={(open) => {
                if (!open) setMembersDrawerGroup(null);
              }}
            />
          ) : null}
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

"use client";

import { SettingsIcon } from "lucide-react";
import Image from "next/image";
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
import { GroupMembersDrawer } from "./group-members-drawer";
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

function formatChatMemberName(
  member: TelegramGroupSummaryDto["members"][number],
) {
  const fullName = [member.firstName, member.lastName]
    .filter(Boolean)
    .join(" ");
  if (fullName) return fullName;
  if (member.username) return `@${member.username}`;
  return member.telegramUserId;
}

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
    timeStyle: "short",
  }).format(new Date(value));
}

function getTrackedMembersProgressPercent(
  tracked: number,
  limit: number,
): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((tracked / limit) * 100));
}

type GroupTrackedMembersProgressProps = {
  group: TelegramGroupSummaryDto;
};

function GroupTrackedMembersProgress({
  group,
}: GroupTrackedMembersProgressProps) {
  const {
    trackedMemberCount,
    trackedMemberLimitPerGroup,
    trackedMemberLimitReached,
  } = group;

  const percent = getTrackedMembersProgressPercent(
    trackedMemberCount,
    trackedMemberLimitPerGroup,
  );

  return (
    <div className="flex min-w-[140px] max-w-xs flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">Gerenciados neste grupo</span>
        <span
          className={cn(
            "shrink-0 font-medium tabular-nums",
            trackedMemberLimitReached
              ? "text-amber-600 dark:text-amber-500"
              : "text-foreground",
          )}
        >
          {trackedMemberCount} / {trackedMemberLimitPerGroup}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={trackedMemberCount}
        aria-valuemin={0}
        aria-valuemax={trackedMemberLimitPerGroup}
        aria-label={`Membros gerenciados neste grupo: ${trackedMemberCount} de ${trackedMemberLimitPerGroup}`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            trackedMemberLimitReached ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] leading-snug text-muted-foreground">
          Limite do plano vale <span className="font-medium">por grupo</span>.
          Novos perfis entram quando o bot recebe eventos de entrada.
        </p>
        <GroupMembersDrawer group={group} />
      </div>
      {trackedMemberLimitReached ? (
        <p className="text-[10px] leading-snug text-amber-600 dark:text-amber-500">
          Capacidade esgotada neste grupo.
        </p>
      ) : null}
    </div>
  );
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

  const hasPopoverFilters =
    botStatusFilter !== "all" || connectedRange?.from !== undefined;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      const matchesSearch =
        !q ||
        (g.title ?? "").toLowerCase().includes(q) ||
        g.telegramChatId.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q) ||
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
                  placeholder="Pesquisar por nome, descrição ou ID do grupo"
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
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[240px] pl-4">Grupo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[200px]">Membros</TableHead>
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
                      <TableCell className="max-w-md align-top">
                        <div className="flex gap-3 py-0.5">
                          {group.chatPhotoUrl ? (
                            <Image
                              src={group.chatPhotoUrl}
                              alt=""
                              width={40}
                              height={40}
                              className="size-10 shrink-0 rounded-lg border border-border object-cover"
                              unoptimized
                            />
                          ) : null}
                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="font-medium text-foreground">
                              {group.title || "Grupo sem nome"}
                            </span>
                            {group.description ? (
                              <p className="line-clamp-2 text-pretty text-xs leading-snug text-muted-foreground">
                                {group.description}
                              </p>
                            ) : null}
                            {group.members.length > 0 ? (
                              <div
                                className="flex flex-wrap items-start gap-1.5 border-t border-border/60 pt-2"
                                title="Amostra dos membros ativos rastreados (ordenados por última atualização)."
                              >
                                <span className="w-full text-[11px] text-muted-foreground">
                                  Amostra no Gateon
                                  {group.trackedMemberCount >
                                  group.members.length
                                    ? ` (${group.members.length} de ${group.trackedMemberCount})`
                                    : ` (${group.trackedMemberCount})`}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {group.members.map((m) => (
                                    <span
                                      key={m.telegramUserId}
                                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-1.5 py-1"
                                    >
                                      {m.profilePhotoUrl ? (
                                        <Image
                                          src={m.profilePhotoUrl}
                                          alt=""
                                          width={24}
                                          height={24}
                                          className="size-6 rounded-full object-cover"
                                          unoptimized
                                        />
                                      ) : (
                                        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
                                          {(
                                            m.firstName?.[0] ??
                                            m.username?.[0] ??
                                            "?"
                                          ).toUpperCase()}
                                        </span>
                                      )}
                                      <span className="max-w-[140px] truncate text-[11px] text-foreground">
                                        {formatChatMemberName(m)}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
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

                      <TableCell className="align-top">
                        <div className="flex flex-col gap-2 py-0.5">
                          {group.memberCount !== null ? (
                            <p className="text-[10px] leading-snug text-muted-foreground">
                              Total no Telegram:{" "}
                              <span className="font-medium tabular-nums text-foreground">
                                {group.memberCount}
                              </span>
                            </p>
                          ) : null}
                          <GroupTrackedMembersProgress group={group} />
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

                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {group.connectedByProfilePhotoUrl ? (
                            <Image
                              src={group.connectedByProfilePhotoUrl}
                              alt=""
                              width={28}
                              height={28}
                              className="size-7 shrink-0 rounded-full border border-border object-cover"
                              title="Foto do Telegram (quem conectou)"
                              unoptimized
                            />
                          ) : null}
                          <span className="min-w-0 truncate">
                            {formatTelegramMemberName(group.connectedBy)}
                          </span>
                        </div>
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

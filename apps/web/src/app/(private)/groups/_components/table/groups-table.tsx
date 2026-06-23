"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { TelegramGroupTypeCell } from "@/app/(private)/groups/_components/table/telegram-group-type-badges";
import { AddGroupBotDialog } from "@/components/add-group-bot-dialog";
import { DataTablePagination } from "@/components/data-table-pagination";
import { SearchIcon, type SearchIconHandle } from "@/components/icons/search";
import { ImageComponent } from "@/components/image-component";
import {
  QuickNoticeDialog,
  type QuickNoticePayload,
} from "@/components/quick-notice-dialog";
import { RemoveGroupDialog } from "@/components/remove-group-dialog";
import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
import { Badge } from "@/components/ui/badge";
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
import {
  toClientPaginationState,
  useServerPaginationFetch,
} from "@/hooks/use-server-pagination-fetch";
import { buildTelegramGroupsListSearchParams } from "@/lib/build-telegram-groups-list-search-params";
import { countActiveGroupsUrlFilters } from "@/lib/filter-utils";
import { getBotStatusDisplay } from "@/lib/telegram-bot-status";
import { cn, withCacheBuster } from "@/lib/utils";
import type { PaginationMeta } from "@/lib/zod/pagination-schemas";
import type {
  TelegramGroupSummaryDto,
  TelegramGroupsListSummaryDto,
  TelegramGroupsPaginatedResponseDto,
} from "@/lib/zod/telegram-group-connection-schemas";
import { telegramGroupsPaginatedResponseSchema } from "@/lib/zod/telegram-group-connection-schemas";
import { useGroupsFiltersUrl } from "../../_hooks/use-groups-filters-url";
import { GroupsFiltersPopover } from "../groups-filters-popover";
import { RefreshAllGroupsButton } from "../refresh-all-groups-button";
import { GroupsEmptyState } from "./group-empty-state";
import { GroupMembersDrawer } from "./group-members-drawer";
import { GroupRowActionsMenu } from "./group-row-actions-menu";
import {
  formatDate,
  getTrackedMembersProgressPercent,
} from "./group-table-helpers";
import { LinkedStripePlansCell } from "./linked-stripe-plans-cell";

type GroupsTableProps = {
  initialGroups: TelegramGroupSummaryDto[];
  initialPagination: PaginationMeta;
  initialSummary: TelegramGroupsListSummaryDto;
};

export function GroupsTable({
  initialGroups,
  initialPagination,
  initialSummary,
}: GroupsTableProps) {
  const router = useRouter();
  const { search, setSearch, clearSearch, urlFilters, filtersPopover } =
    useGroupsFiltersUrl();
  const searchIconRef = useRef<SearchIconHandle>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [membersDrawerGroup, setMembersDrawerGroup] =
    useState<TelegramGroupSummaryDto | null>(null);
  const [removeGroupTarget, setRemoveGroupTarget] =
    useState<TelegramGroupSummaryDto | null>(null);
  const [quickNoticePayload, setQuickNoticePayload] =
    useState<QuickNoticePayload | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    async (page: number) => {
      const params = buildTelegramGroupsListSearchParams({
        page,
        search: debouncedSearch,
        urlFilters,
      });
      const response = await fetch(
        `/api/telegram/groups?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return null;
      }

      const parsed = telegramGroupsPaginatedResponseSchema.safeParse(
        await response.json(),
      );
      return parsed.success ? parsed.data : null;
    },
    [debouncedSearch, urlFilters],
  );

  const { data, setPage, isLoading, reload } =
    useServerPaginationFetch<TelegramGroupsPaginatedResponseDto>({
      fetchPage,
      resetKey: `${debouncedSearch}:${JSON.stringify(urlFilters)}`,
      initialData: {
        groups: initialGroups,
        pagination: initialPagination,
        summary: initialSummary,
      },
      initialPage: initialPagination.page,
    });

  const groups = data?.groups ?? initialGroups;
  const summary = data?.summary ?? initialSummary;
  const pagination = toClientPaginationState(
    data?.pagination ?? initialPagination,
    setPage,
  );

  useEffect(() => {
    if (!membersDrawerGroup) {
      return;
    }

    const fresh = groups.find((group) => group.id === membersDrawerGroup.id);
    if (fresh) {
      setMembersDrawerGroup(fresh);
    }
  }, [groups, membersDrawerGroup]);

  const hasPopoverFilters = countActiveGroupsUrlFilters(urlFilters) > 0;
  const hasNoGroups = summary.totalGroups === 0;
  const hasActiveSearch = debouncedSearch.length > 0;
  const isSearchEmpty =
    !hasNoGroups && pagination.totalItems === 0 && hasActiveSearch;
  const isPopoverFilterEmpty =
    !hasNoGroups &&
    pagination.totalItems === 0 &&
    !hasActiveSearch &&
    hasPopoverFilters;

  return (
    <div className="relative flex flex-col gap-3">
      {hasNoGroups ? (
        <GroupsEmptyState
          hasNoGroups
          isPopoverFilterEmpty={false}
          isSearchEmpty={false}
          onClearPopoverFilters={filtersPopover.clear}
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
              <GroupsFiltersPopover control={filtersPopover} />
              <RefreshAllGroupsButton disabled={summary.totalGroups === 0} />
            </div>
            <AddGroupBotDialog />
          </div>
          <div
            className={cn(
              "overflow-x-auto rounded-md border border-border bg-background shadow-xs",
              isLoading && "opacity-60",
            )}
          >
            <Table className="w-full min-w-max table-auto">
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted!">
                  <TableHead className="min-w-60">Grupo</TableHead>
                  <TableHead className="w-55 min-w-55">Membros</TableHead>
                  <TableHead className="hidden w-32 min-w-32 whitespace-nowrap px-2 text-center sm:table-cell">
                    Tipo
                  </TableHead>
                  <TableHead className="hidden w-44 min-w-44 whitespace-nowrap px-2 text-center lg:table-cell">
                    Planos
                  </TableHead>
                  <TableHead className="hidden w-36 min-w-36 whitespace-nowrap px-2 text-center md:table-cell">
                    Conectado em
                  </TableHead>
                  <TableHead className="w-40 min-w-40 whitespace-nowrap px-2 text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-20 min-w-20 px-2 text-center">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {groups.map((group) => {
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
                      <TableCell className="min-w-60">
                        <div className="flex min-w-0 gap-3">
                          <ImageComponent
                            src={
                              group.chatPhotoUrl
                                ? withCacheBuster(
                                    group.chatPhotoUrl,
                                    group.updatedAt,
                                  )
                                : null
                            }
                            alt={group.title?.trim() || "Sem título"}
                            width={38}
                            height={38}
                            sizes="38px"
                            avatarFallbackClassName="text-sm!"
                            className="size-[38px] shrink-0 rounded-full border border-border object-cover"
                          />
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

                      <TableCell className="w-55 min-w-55">
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

                      <TableCell className="hidden w-32 min-w-32 align-middle sm:table-cell">
                        <TelegramGroupTypeCell
                          type={group.type}
                          isForum={group.isForum}
                        />
                      </TableCell>

                      <TableCell className="hidden w-44 min-w-44 px-2 text-center align-center lg:table-cell">
                        <LinkedStripePlansCell
                          plans={group.linkedStripePlans}
                        />
                      </TableCell>

                      <TableCell className="hidden w-36 min-w-36 text-center whitespace-nowrap align-middle md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(group.connectedAt)}
                        </span>
                      </TableCell>

                      <TableCell className="w-40 min-w-40 px-2 align-middle">
                        <div className="flex min-w-0 justify-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "h-auto min-w-0 max-w-full shrink gap-1.5 py-0.5 font-medium",
                              botDisplay.className,
                            )}
                            title={botDisplay.label}
                          >
                            <span className="truncate">{botDisplay.label}</span>
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell
                        className="w-20 min-w-20 px-1 text-center align-middle"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <GroupRowActionsMenu
                          groupId={group.id}
                          groupTitle={group.title ?? ""}
                          onViewMembers={() => setMembersDrawerGroup(group)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {pagination.totalItems === 0 ? (
                  <TableRow className="hover:bg-background">
                    <TableCell colSpan={8} className="p-0">
                      <GroupsEmptyState
                        embedded
                        hasNoGroups={false}
                        isPopoverFilterEmpty={isPopoverFilterEmpty}
                        isSearchEmpty={isSearchEmpty}
                        onClearPopoverFilters={filtersPopover.clear}
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
              nestedDialogOpen={quickNoticePayload !== null}
              onOpenChange={(open) => {
                if (!open) setMembersDrawerGroup(null);
              }}
              onQuickNoticeRequest={setQuickNoticePayload}
              onRequestRemove={() => {
                setRemoveGroupTarget(membersDrawerGroup);
                setMembersDrawerGroup(null);
              }}
            />
          ) : null}

          <QuickNoticeDialog
            open={quickNoticePayload !== null}
            payload={quickNoticePayload}
            onOpenChange={(open) => {
              if (!open) {
                setQuickNoticePayload(null);
              }
            }}
            onSent={() => {
              reload();
              router.refresh();
            }}
          />

          <RemoveGroupDialog
            groupId={removeGroupTarget?.id ?? ""}
            groupTitle={removeGroupTarget?.title ?? ""}
            open={removeGroupTarget !== null}
            onOpenChange={(open) => {
              if (!open) {
                setRemoveGroupTarget(null);
              }
            }}
            onRemoved={() => {
              setRemoveGroupTarget(null);
              setMembersDrawerGroup(null);
              reload();
              router.refresh();
            }}
          />
        </>
      )}

      {pagination.totalItems > 0 ? (
        <DataTablePagination
          pagination={pagination}
          itemLabel="grupo"
          itemLabelPlural="grupos"
        />
      ) : null}
    </div>
  );
}

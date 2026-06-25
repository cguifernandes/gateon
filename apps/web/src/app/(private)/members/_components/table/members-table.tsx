"use client";

import { useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DataRefreshIndicator } from "@/components/data-refresh-indicator";
import { DataTablePagination } from "@/components/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { SearchIcon, type SearchIconHandle } from "@/components/icons/search";
import { ImageComponent } from "@/components/image-component";
import { MemberActionsToolbar } from "@/components/member-actions-toolbar";
import { MemberOwnerBadge } from "@/components/member-owner-badge";
import { MemberStripeBadges } from "@/components/member-stripe-badges";
import { QuickNoticeDialog } from "@/components/quick-notice-dialog";
import { RefreshGroupButton } from "@/components/refresh-group-button";
import { TableResultsEmptyState } from "@/components/table-results-empty-state";
import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { countActiveMembersUrlFilters } from "@/lib/filter-utils";
import { resolveTableEmptyState } from "@/lib/resolve-table-empty-state";
import { getTrackedMemberStatusDisplay } from "@/lib/telegram-bot-status";
import { cn, withCacheBuster } from "@/lib/utils";
import {
  MEMBERS_TABLE_PAGE_SIZE,
  type PaginationMeta,
} from "@/lib/zod/pagination-schemas";
import type {
  TelegramGroupSummaryDto,
  TelegramGroupsListSummaryDto,
  TelegramGroupsPaginatedResponseDto,
  TelegramMembersListSummaryDto,
} from "@/lib/zod/telegram-group-connection-schemas";
import { telegramGroupsPaginatedResponseSchema } from "@/lib/zod/telegram-group-connection-schemas";
import { useMembersFiltersUrl } from "../../_hooks/use-members-filters-url";
import {
  formatGroupMemberStatusSummary,
  formatMemberDate,
  getGroupMemberKeys,
  getMemberDisplayName,
  getMemberInitials,
  getMemberKey,
  getVisibleSelectionSummary,
  isMemberLeft,
  isMemberOwner,
  type MemberSummary,
  type VisibleGroup,
} from "../members-table-helpers";
import { MemberSelectionCheckbox } from "./member-selection-checkbox";
import { MembersBulkSelectionToolbar } from "./members-bulk-selection-toolbar";
import { MembersEmptyState } from "./members-empty-state";
import { MembersFiltersPopover } from "./members-filters-popover";

type MembersTableProps = {
  initialGroups: TelegramGroupSummaryDto[];
  initialPagination: PaginationMeta;
  initialMembersSummary: TelegramMembersListSummaryDto;
  initialSummary: TelegramGroupsListSummaryDto;
  filterGroups: TelegramGroupSummaryDto[];
};

export function MembersTable({
  initialGroups,
  initialPagination,
  initialMembersSummary,
  initialSummary,
  filterGroups,
}: MembersTableProps) {
  const router = useRouter();
  const { search, setSearch, clearSearch, urlFilters, filtersPopover } =
    useMembersFiltersUrl();
  const searchIconRef = useRef<SearchIconHandle>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedMemberKeys, setSelectedMemberKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [quickNoticePayload, setQuickNoticePayload] = useState<{
    type: "members";
    title: string;
    targets: { telegramUserId: string; displayName?: string }[];
  } | null>(null);
  const hasPopoverFilters = countActiveMembersUrlFilters(urlFilters) > 0;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    async (page: number, signal?: AbortSignal) => {
      const params = buildTelegramGroupsListSearchParams({
        page,
        pageSize: MEMBERS_TABLE_PAGE_SIZE,
        view: "members",
        search: debouncedSearch,
        urlFilters,
      });
      const response = await fetch(
        `/api/telegram/groups?${params.toString()}`,
        {
          cache: "no-store",
          signal,
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

  const { data, setPage, isRefreshing, reload } =
    useServerPaginationFetch<TelegramGroupsPaginatedResponseDto>({
      fetchPage,
      resetKey: `${debouncedSearch}:${JSON.stringify(urlFilters)}`,
      initialData: {
        groups: initialGroups,
        pagination: initialPagination,
        summary: initialSummary,
        membersSummary: initialMembersSummary,
      },
      initialPage: initialPagination.page,
    });

  const groups = data?.groups ?? initialGroups;
  const membersSummary = data?.membersSummary ?? initialMembersSummary;
  const pagination = toClientPaginationState(
    data?.pagination ?? initialPagination,
    setPage,
  );

  const isSearchPending = search.trim() !== debouncedSearch;
  const showDataRefresh =
    isRefreshing || filtersPopover.isFiltersPending || isSearchPending;

  const visibleGroups: VisibleGroup[] = groups.map((group) => ({
    ...group,
    visibleMembers: group.members,
  }));
  const paginatedGroups = visibleGroups;
  const handleGroupDataSynced = useCallback(() => {
    void reload();
  }, [reload]);
  const hasNoGroups =
    (data?.summary.totalGroups ?? initialSummary.totalGroups) === 0;
  const hasNoMembers = membersSummary.totalMembers === 0;
  const tableEmpty = resolveTableEmptyState({
    visibleRowCount: paginatedGroups.length,
    totalItems: pagination.totalItems,
    searchInput: search,
    debouncedSearch,
    hasActiveFilters: hasPopoverFilters,
    isRefreshing: showDataRefresh,
  });
  const showFullPageEmpty = hasNoGroups || hasNoMembers;

  const visibleGroupIds = paginatedGroups.map((group) => group.id);
  const allVisibleSelected =
    paginatedGroups.length > 0 &&
    visibleGroupIds.every((groupId) => selectedGroupIds.has(groupId));
  const hasPartialVisibleSelection = paginatedGroups.some((group) => {
    if (selectedGroupIds.has(group.id)) {
      return true;
    }

    return getGroupMemberKeys(group).some((key) => selectedMemberKeys.has(key));
  });

  const selectionSummary = useMemo(
    () =>
      getVisibleSelectionSummary(
        visibleGroups,
        selectedGroupIds,
        selectedMemberKeys,
      ),
    [visibleGroups, selectedGroupIds, selectedMemberKeys],
  );

  function clearSelection() {
    setSelectedGroupIds(new Set());
    setSelectedMemberKeys(new Set());
  }

  function toggleGroup(group: VisibleGroup, checked: boolean) {
    setSelectedGroupIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(group.id);
      } else {
        next.delete(group.id);
      }
      return next;
    });

    setSelectedMemberKeys((current) => {
      const next = new Set(current);
      for (const key of getGroupMemberKeys(group)) {
        if (checked) {
          next.add(key);
        } else {
          next.delete(key);
        }
      }
      return next;
    });
  }

  function toggleMember(
    group: VisibleGroup,
    member: MemberSummary,
    checked: boolean,
  ) {
    const memberKey = getMemberKey(group.id, member.telegramUserId);

    setSelectedGroupIds((current) => {
      const next = new Set(current);
      next.delete(group.id);
      return next;
    });

    setSelectedMemberKeys((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(memberKey);
      } else {
        next.delete(memberKey);
      }
      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedGroupIds((current) => {
      const next = new Set(current);
      for (const group of paginatedGroups) {
        if (checked) {
          next.add(group.id);
        } else {
          next.delete(group.id);
        }
      }
      return next;
    });

    setSelectedMemberKeys((current) => {
      const next = new Set(current);
      for (const group of paginatedGroups) {
        for (const key of getGroupMemberKeys(group)) {
          if (checked) {
            next.add(key);
          } else {
            next.delete(key);
          }
        }
      }
      return next;
    });
  }

  return (
    <div className="relative flex flex-col gap-3">
      {showFullPageEmpty ? (
        <MembersEmptyState
          hasNoGroups={hasNoGroups}
          hasNoMembers={hasNoMembers}
          isSearchEmpty={false}
          onClearSearch={clearSearch}
        />
      ) : (
        <>
          <DataTableToolbar
            search={
              <>
                <SearchIcon
                  ref={searchIconRef}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
                <Input
                  placeholder="Pesquisar por membro, ID ou grupo"
                  type="search"
                  value={search}
                  className="pl-9"
                  onFocus={() => searchIconRef.current?.startAnimation()}
                  onBlur={() => searchIconRef.current?.stopAnimation()}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </>
            }
            controls={
              <MembersFiltersPopover
                groups={filterGroups}
                control={filtersPopover}
              />
            }
          />
          <div className="relative overflow-x-auto rounded-md border border-border bg-background shadow-xs">
            <DataRefreshIndicator visible={showDataRefresh} />
            <div
              className={cn(
                "transition-opacity",
                showDataRefresh && "opacity-50 blur-xs",
              )}
            >
              <Table className="w-full min-w-0 table-auto sm:min-w-4xl sm:table-fixed">
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted!">
                    <TableHead className="w-8 min-w-8 px-2 text-center sm:px-3">
                      <MemberSelectionCheckbox
                        checked={allVisibleSelected}
                        indeterminate={
                          !allVisibleSelected && hasPartialVisibleSelection
                        }
                        label="Selecionar grupos exibidos"
                        onCheckedChange={toggleAllVisible}
                      />
                    </TableHead>
                    <TableHead className="min-w-0 sm:min-w-60">Membro</TableHead>
                    <TableHead className="hidden w-36 min-w-36 whitespace-nowrap px-2 text-center md:table-cell">
                      Entrada
                    </TableHead>
                    <TableHead className="hidden w-36 min-w-36 whitespace-nowrap px-2 text-center md:table-cell">
                      Saída
                    </TableHead>
                    <TableHead className="hidden w-40 min-w-40 whitespace-nowrap px-2 text-center sm:table-cell">
                      Status
                    </TableHead>
                    <TableHead className="w-28 min-w-28 px-2 text-center sm:w-36 sm:min-w-36">
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedGroups.map((group) => {
                    const groupMemberKeys = getGroupMemberKeys(group);
                    const selectedMembersInGroup = groupMemberKeys.filter(
                      (key) => selectedMemberKeys.has(key),
                    ).length;
                    const isGroupSelected = selectedGroupIds.has(group.id);
                    const isGroupIndeterminate =
                      !isGroupSelected && selectedMembersInGroup > 0;

                    return (
                      <Fragment key={group.id}>
                        <TableRow className="bg-muted/40 hover:bg-muted/50">
                          <TableCell className="w-8 min-w-8 px-2 text-center sm:px-3">
                            <MemberSelectionCheckbox
                              checked={isGroupSelected}
                              indeterminate={isGroupIndeterminate}
                              label={`Selecionar grupo ${group.title ?? group.telegramChatId}`}
                              onCheckedChange={(checked) =>
                                toggleGroup(group, checked)
                              }
                            />
                          </TableCell>
                          <TableCell className="overflow-hidden py-3">
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
                                width={36}
                                height={36}
                                sizes="36px"
                                avatarFallbackClassName="text-sm!"
                                className="size-[36px] shrink-0 rounded-full border border-border object-cover"
                              />
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <TruncatedTextTooltip
                                  text={group.title ?? "Grupo sem nome"}
                                  variant="truncate"
                                  className="font-heading font-semibold text-foreground"
                                />
                                <p className="truncate text-muted-foreground text-xs">
                                  {group.telegramChatId}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden w-36 min-w-36 py-3 md:table-cell" />
                          <TableCell className="hidden w-36 min-w-36 py-3 md:table-cell" />
                          <TableCell className="hidden w-40 min-w-40 py-3 text-center sm:table-cell">
                            <Badge
                              variant="outline"
                              className="mx-auto w-max whitespace-nowrap"
                            >
                              {formatGroupMemberStatusSummary(group.members)}
                            </Badge>
                          </TableCell>
                          <TableCell className="w-28 min-w-28 py-3 text-center sm:w-36 sm:min-w-36">
                            <div className="flex justify-end">
                              <RefreshGroupButton
                                groupId={group.id}
                                groupTitle={group.title ?? undefined}
                                onSynced={handleGroupDataSynced}
                              />
                            </div>
                          </TableCell>
                        </TableRow>

                        {group.visibleMembers.length === 0 ? (
                          <TableRow key={`${group.id}-empty`}>
                            <TableCell
                              colSpan={6}
                              className="text-muted-foreground text-sm"
                            >
                              Nenhum membro encontrado neste grupo.
                            </TableCell>
                          </TableRow>
                        ) : (
                          group.visibleMembers.map((member) => {
                            const memberKey = getMemberKey(
                              group.id,
                              member.telegramUserId,
                            );
                            const isMemberSelected =
                              isGroupSelected ||
                              selectedMemberKeys.has(memberKey);
                            const displayName = getMemberDisplayName(member);
                            const memberLeft = isMemberLeft(member);
                            const memberStatusDisplay =
                              getTrackedMemberStatusDisplay(
                                memberLeft ? "left" : "active",
                              );
                            const memberRowMutedClass = memberLeft
                              ? "opacity-40"
                              : undefined;

                            return (
                              <TableRow
                                key={memberKey}
                                data-state={
                                  isMemberSelected ? "selected" : undefined
                                }
                                className="group/row transition-colors hover:bg-muted/50"
                              >
                                <TableCell
                                  className={cn(
                                    "w-8 min-w-8 px-2 text-center sm:px-3",
                                    memberRowMutedClass,
                                  )}
                                >
                                  <MemberSelectionCheckbox
                                    checked={isMemberSelected}
                                    label={`Selecionar ${displayName}`}
                                    onCheckedChange={(checked) =>
                                      toggleMember(group, member, checked)
                                    }
                                  />
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "overflow-hidden py-2 pl-4 sm:pl-8",
                                    memberRowMutedClass,
                                  )}
                                >
                                  <div className="flex min-w-0 gap-3">
                                    <ImageComponent
                                      src={member.profilePhotoUrl ?? null}
                                      alt={displayName}
                                      width={32}
                                      height={32}
                                      sizes="32px"
                                      fallback={
                                        <span className="text-xs font-semibold uppercase">
                                          {getMemberInitials(member)}
                                        </span>
                                      }
                                      className="size-[32px] shrink-0 rounded-full border border-border object-cover"
                                    />
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                        <div className="min-w-0 max-w-full overflow-hidden sm:max-w-40">
                                          <TruncatedTextTooltip
                                            text={displayName}
                                            variant="truncate"
                                            className="font-medium text-foreground"
                                          />
                                        </div>
                                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                                          {isMemberOwner(member) ? (
                                            <MemberOwnerBadge />
                                          ) : null}
                                          <MemberStripeBadges
                                            plans={member.linkedStripePlans}
                                          />
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "h-4 gap-1 px-1.5 py-0 text-[10px] leading-none font-medium whitespace-nowrap sm:hidden",
                                              memberStatusDisplay.className,
                                            )}
                                          >
                                            {memberLeft ? "Saiu" : "Ativo"}
                                          </Badge>
                                        </div>
                                      </div>
                                      <span className="truncate text-muted-foreground text-xs">
                                        {member.telegramUserId}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "hidden w-36 min-w-36 text-center whitespace-nowrap text-muted-foreground align-middle md:table-cell",
                                    memberRowMutedClass,
                                  )}
                                >
                                  {formatMemberDate(member.joinedAt)}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "hidden w-36 min-w-36 text-center whitespace-nowrap text-muted-foreground align-middle md:table-cell",
                                    memberRowMutedClass,
                                  )}
                                >
                                  {member.leftAt
                                    ? formatMemberDate(member.leftAt)
                                    : "-"}
                                </TableCell>

                                <TableCell
                                  className={cn(
                                    "hidden w-40 min-w-40 text-center align-middle sm:table-cell",
                                    memberRowMutedClass,
                                  )}
                                >
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "mx-auto w-max shrink-0 gap-1.5 text-xs font-medium whitespace-nowrap",
                                      memberStatusDisplay.className,
                                    )}
                                  >
                                    {memberLeft ? "Saiu" : "Ativo"}
                                  </Badge>
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "w-28 min-w-28 py-2 align-middle sm:w-36 sm:min-w-36",
                                    memberRowMutedClass,
                                  )}
                                >
                                  <MemberActionsToolbar
                                    groupId={group.id}
                                    telegramUserId={member.telegramUserId}
                                    displayName={displayName}
                                    isInactive={memberLeft}
                                    isOwner={member.isOwner}
                                    onSendNotice={() =>
                                      setQuickNoticePayload({
                                        type: "members",
                                        title: displayName,
                                        targets: [
                                          {
                                            telegramUserId:
                                              member.telegramUserId,
                                            displayName,
                                          },
                                        ],
                                      })
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </Fragment>
                    );
                  })}

                  {tableEmpty.show && tableEmpty.kind ? (
                    <TableRow className="hover:bg-background">
                      <TableCell colSpan={6} className="p-0">
                        <TableResultsEmptyState
                          kind={tableEmpty.kind}
                          resource="members"
                          isRefreshing={showDataRefresh}
                          onClearSearch={clearSearch}
                          onClearFilters={filtersPopover.clear}
                        />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {!showFullPageEmpty && selectionSummary.count > 0 ? (
        <MembersBulkSelectionToolbar
          selectedCount={selectionSummary.count}
          selectedTargets={selectionSummary.targets}
          selectedTelegramUserIds={selectionSummary.telegramUserIds}
          hasRemovableMember={selectionSummary.hasRemovableMember}
          onClear={clearSelection}
          onSendNotice={() => {
            const targetsByUserId = new Map<
              string,
              { telegramUserId: string; displayName?: string }
            >();

            for (const target of selectionSummary.targets) {
              const member = groups
                .find((group) => group.id === target.groupId)
                ?.members.find(
                  (item) => item.telegramUserId === target.telegramUserId,
                );

              targetsByUserId.set(target.telegramUserId, {
                telegramUserId: target.telegramUserId,
                displayName: member ? getMemberDisplayName(member) : undefined,
              });
            }

            setQuickNoticePayload({
              type: "members",
              title: `${targetsByUserId.size} membro${targetsByUserId.size === 1 ? "" : "s"}`,
              targets: [...targetsByUserId.values()],
            });
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

      {!showFullPageEmpty && pagination.totalItems > 0 ? (
        <DataTablePagination
          pagination={pagination}
          itemLabel="grupo"
          itemLabelPlural="grupos"
          summaryClassName={selectionSummary.count > 0 ? "pb-16" : undefined}
        />
      ) : null}
    </div>
  );
}

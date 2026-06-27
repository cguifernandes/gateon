"use client";

import { useRouter } from "next/navigation";
import { startTransition, useCallback, useMemo, useRef, useState } from "react";
import { DataRefreshIndicator } from "@/components/data-refresh-indicator";
import { DataTablePagination } from "@/components/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { SearchIcon, type SearchIconHandle } from "@/components/icons/search";
import {
  QuickNoticeDialog,
  type QuickNoticePayload,
} from "@/components/quick-notice-dialog";
import { TableResultsEmptyState } from "@/components/table-results-empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  toClientPaginationState,
  useServerPaginationFetch,
} from "@/hooks/use-server-pagination-fetch";
import { resolveTableEmptyState } from "@/lib/filters/table-empty-state";
import { countActiveMembersUrlFilters } from "@/lib/filters/utils";
import { buildTelegramGroupsListSearchParams } from "@/lib/query/telegram-groups-list-params";
import { cn } from "@/lib/utils";
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
import { useMembersPerGroupPageSize } from "../../_hooks/use-members-per-group-page-size";
import {
  getGroupMemberSelectionFingerprint,
  getMemberDisplayName,
  getMemberKey,
  getVisibleSelectionSummary,
  type MemberSummary,
  type QuickNoticeTarget,
  type VisibleGroup,
} from "../members-table-helpers";
import { MemberSelectionCheckbox } from "./member-selection-checkbox";
import { MembersBulkSelectionToolbar } from "./members-bulk-selection-toolbar";
import { MembersEmptyState } from "./members-empty-state";
import { MembersFiltersPopover } from "./members-filters-popover";
import { MembersTableGroupSection } from "./members-table-group-section";

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
  const {
    pageSize: membersPerGroupPageSize,
    setPageSize: setMembersPerGroupPageSize,
  } = useMembersPerGroupPageSize();
  const searchIconRef = useRef<SearchIconHandle>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedMemberKeys, setSelectedMemberKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [membersPages, setMembersPages] = useState<Record<string, number>>({});

  const handleMembersPerGroupPageSizeChange = useCallback(
    (nextPageSize: typeof membersPerGroupPageSize) => {
      setMembersPerGroupPageSize(nextPageSize);
      setMembersPages({});
    },
    [setMembersPerGroupPageSize],
  );

  const { search, setSearch, clearSearch, urlFilters, filtersPopover } =
    useMembersFiltersUrl({
      membersPerGroupPageSize,
      onApplyMembersPerGroupPageSize: handleMembersPerGroupPageSizeChange,
    });
  const debouncedSearch = useDebouncedValue(search.trim());
  const [quickNoticePayload, setQuickNoticePayload] =
    useState<QuickNoticePayload | null>(null);
  const hasPopoverFilters = countActiveMembersUrlFilters(urlFilters) > 0;

  const fetchPage = useCallback(
    async (page: number, signal?: AbortSignal) => {
      const params = buildTelegramGroupsListSearchParams({
        page,
        pageSize: MEMBERS_TABLE_PAGE_SIZE,
        view: "members",
        membersPerGroupPageSize,
        membersPages,
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
    [debouncedSearch, membersPages, membersPerGroupPageSize, urlFilters],
  );

  const { data, setPage, isRefreshing, reload } =
    useServerPaginationFetch<TelegramGroupsPaginatedResponseDto>({
      fetchPage,
      resetKey: `${debouncedSearch}:${JSON.stringify(urlFilters)}:${JSON.stringify(membersPages)}:${membersPerGroupPageSize}`,
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

  const visibleGroups = useMemo<VisibleGroup[]>(
    () =>
      groups.map((group) => ({
        ...group,
        visibleMembers: group.members,
      })),
    [groups],
  );
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

  const selectedMemberKeysRef = useRef(selectedMemberKeys);
  selectedMemberKeysRef.current = selectedMemberKeys;

  const isMemberKeySelected = useCallback(
    (memberKey: string) => selectedMemberKeysRef.current.has(memberKey),
    [],
  );

  const groupSelectionFingerprints = useMemo(() => {
    const fingerprints = new Map<string, string>();
    for (const group of paginatedGroups) {
      fingerprints.set(
        group.id,
        getGroupMemberSelectionFingerprint(group.id, selectedMemberKeys),
      );
    }
    return fingerprints;
  }, [paginatedGroups, selectedMemberKeys]);

  const visibleGroupIds = useMemo(
    () => paginatedGroups.map((group) => group.id),
    [paginatedGroups],
  );
  const allVisibleSelected =
    paginatedGroups.length > 0 &&
    visibleGroupIds.every((groupId) => selectedGroupIds.has(groupId));
  const hasPartialVisibleSelection = useMemo(() => {
    const selectedGroupsOnPage = paginatedGroups.filter((group) =>
      selectedGroupIds.has(group.id),
    ).length;

    if (
      selectedGroupsOnPage > 0 &&
      selectedGroupsOnPage < paginatedGroups.length
    ) {
      return true;
    }

    if (selectedMemberKeys.size === 0) {
      return false;
    }

    return !paginatedGroups.every((group) => selectedGroupIds.has(group.id));
  }, [paginatedGroups, selectedGroupIds, selectedMemberKeys.size]);

  const selectionSummary = useMemo(
    () =>
      getVisibleSelectionSummary(
        visibleGroups,
        selectedGroupIds,
        selectedMemberKeys,
      ),
    [visibleGroups, selectedGroupIds, selectedMemberKeys],
  );

  const clearSelection = useCallback(() => {
    startTransition(() => {
      setSelectedGroupIds(new Set());
      setSelectedMemberKeys(new Set());
    });
  }, []);

  const toggleGroup = useCallback((groupId: string, checked: boolean) => {
    startTransition(() => {
      setSelectedGroupIds((current) => {
        const next = new Set(current);
        if (checked) {
          next.add(groupId);
        } else {
          next.delete(groupId);
        }
        return next;
      });

      if (!checked) {
        setSelectedMemberKeys((current) => {
          const next = new Set(current);
          const prefix = `${groupId}:`;
          for (const key of current) {
            if (key.startsWith(prefix)) {
              next.delete(key);
            }
          }
          return next;
        });
      }
    });
  }, []);

  const toggleMember = useCallback(
    (groupId: string, member: MemberSummary, checked: boolean) => {
      const memberKey = getMemberKey(groupId, member.telegramUserId);

      startTransition(() => {
        setSelectedGroupIds((current) => {
          if (!current.has(groupId)) {
            return current;
          }
          const next = new Set(current);
          next.delete(groupId);
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
      });
    },
    [],
  );

  const toggleAllVisible = useCallback(
    (checked: boolean) => {
      startTransition(() => {
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

        if (!checked) {
          setSelectedMemberKeys((current) => {
            const next = new Set(current);
            for (const group of paginatedGroups) {
              const prefix = `${group.id}:`;
              for (const key of current) {
                if (key.startsWith(prefix)) {
                  next.delete(key);
                }
              }
            }
            return next;
          });
        }
      });
    },
    [paginatedGroups],
  );

  const handleSendMemberNotice = useCallback(
    (telegramUserId: string, displayName: string) => {
      setQuickNoticePayload({
        type: "members",
        title: displayName,
        targets: [{ telegramUserId, displayName }],
      });
    },
    [],
  );

  const handleGroupMembersPageChange = useCallback(
    (groupId: string, page: number) => {
      setMembersPages((current) => ({
        ...current,
        [groupId]: page,
      }));
    },
    [],
  );

  return (
    <div className="relative flex flex-col gap-3 pb-10">
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
                    <TableHead className="min-w-0 sm:min-w-60">
                      Membro
                    </TableHead>
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
                  {paginatedGroups.map((group) => (
                    <MembersTableGroupSection
                      key={group.id}
                      group={group}
                      isGroupSelected={selectedGroupIds.has(group.id)}
                      memberSelectionFingerprint={
                        groupSelectionFingerprints.get(group.id) ?? ""
                      }
                      isMemberKeySelected={isMemberKeySelected}
                      onToggleGroup={toggleGroup}
                      onToggleMember={toggleMember}
                      onSendMemberNotice={handleSendMemberNotice}
                      onGroupMembersPageChange={handleGroupMembersPageChange}
                      onGroupDataSynced={handleGroupDataSynced}
                      showDataRefresh={showDataRefresh}
                    />
                  ))}

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
            const targets: QuickNoticeTarget[] = [];

            for (const target of selectionSummary.targets) {
              if (target.selectAllInGroup) {
                targets.push({
                  groupId: target.groupId,
                  selectAllInGroup: true,
                });

                continue;
              }

              if (!target.telegramUserId) {
                continue;
              }

              const member = groups
                .find((group) => group.id === target.groupId)
                ?.members.find(
                  (item) => item.telegramUserId === target.telegramUserId,
                );

              targets.push({
                telegramUserId: target.telegramUserId,
                displayName: member ? getMemberDisplayName(member) : undefined,
              });
            }

            setQuickNoticePayload({
              type: "members",
              title: `${selectionSummary.count} membro${selectionSummary.count === 1 ? "" : "s"}`,
              targets,
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

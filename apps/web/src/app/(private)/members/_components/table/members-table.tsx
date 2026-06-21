"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, type SearchIconHandle } from "@/components/icons/search";
import { ImageComponent } from "@/components/image-component";
import { MemberActionsToolbar } from "@/components/member-actions-toolbar";
import { MemberOwnerBadge } from "@/components/member-owner-badge";
import { MemberStripePayerBadge } from "@/components/member-stripe-payer-badge";
import { QuickNoticeDialog } from "@/components/quick-notice-dialog";
import { RefreshGroupButton } from "@/components/refresh-group-button";
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
import { countActiveMembersUrlFilters } from "@/lib/filter-utils";
import {
  matchesTelegramChatIdsFilter,
  memberPassesPopoverFilters,
} from "@/lib/members-filter";
import { getTrackedMemberStatusDisplay } from "@/lib/telegram-bot-status";
import { cn, withCacheBuster } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { useMembersFiltersUrl } from "../../_hooks/use-members-filters-url";
import {
  formatGroupMemberStatusSummary,
  formatMemberDate,
  getGroupMemberKeys,
  getMemberDisplayName,
  getMemberInitials,
  getMemberKey,
  getVisibleSelectionSummary,
  groupMatchesSearch,
  isMemberLeft,
  isMemberOwner,
  type MemberSummary,
  memberMatchesSearch,
  sortMembersActiveFirst,
  type VisibleGroup,
} from "../members-table-helpers";
import { MemberSelectionCheckbox } from "./member-selection-checkbox";
import { MembersBulkSelectionToolbar } from "./members-bulk-selection-toolbar";
import { MembersEmptyState } from "./members-empty-state";
import { MembersFiltersPopover } from "./members-filters-popover";

type MembersTableProps = {
  groups: TelegramGroupSummaryDto[];
};

export function MembersTable({ groups }: MembersTableProps) {
  const router = useRouter();
  const { search, setSearch, clearSearch, urlFilters, filtersPopover } =
    useMembersFiltersUrl();
  const searchIconRef = useRef<SearchIconHandle>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedMemberKeys, setSelectedMemberKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [quickNoticePayload, setQuickNoticePayload] = useState<
    | {
        type: "members";
        title: string;
        targets: { telegramUserId: string; displayName?: string }[];
      }
    | null
  >(null);
  const query = search.trim().toLowerCase();
  const hasPopoverFilters = countActiveMembersUrlFilters(urlFilters) > 0;

  const popoverFilters = useMemo(
    () => ({
      memberStatus: urlFilters.memberStatus,
      joinedRange: urlFilters.joinedRange,
      leftRange: urlFilters.leftRange,
    }),
    [urlFilters],
  );

  const visibleGroups = useMemo<VisibleGroup[]>(() => {
    return groups
      .filter((group) =>
        matchesTelegramChatIdsFilter(
          group.telegramChatId,
          urlFilters.telegramChatIds,
        ),
      )
      .map((group) => {
        const filteredMembers = group.members.filter((member) =>
          memberPassesPopoverFilters(member, popoverFilters),
        );

        const visibleMembers = sortMembersActiveFirst(
          !query
            ? filteredMembers
            : groupMatchesSearch(group, query)
              ? filteredMembers
              : filteredMembers.filter((member) =>
                  memberMatchesSearch(member, query),
                ),
        );

        return { ...group, visibleMembers };
      })
      .filter((group) => {
        if (!query && !hasPopoverFilters) {
          return true;
        }

        if (
          urlFilters.telegramChatIds.length > 0 &&
          urlFilters.telegramChatIds.some(
            (id) => id.trim() === group.telegramChatId.trim(),
          )
        ) {
          return true;
        }

        if (query && groupMatchesSearch(group, query)) {
          return true;
        }

        return group.visibleMembers.length > 0;
      });
  }, [
    groups,
    query,
    popoverFilters,
    urlFilters.telegramChatIds,
    hasPopoverFilters,
  ]);

  const visibleMemberCount = visibleGroups.reduce(
    (total, group) => total + group.visibleMembers.length,
    0,
  );
  const totalMemberCount = groups.reduce(
    (total, group) => total + group.members.length,
    0,
  );
  const hasNoGroups = groups.length === 0;
  const hasNoMembers = !hasNoGroups && totalMemberCount === 0;
  const hasActiveSearch = query.length > 0;
  const isSearchEmpty =
    !hasNoGroups &&
    !hasNoMembers &&
    visibleMemberCount === 0 &&
    hasActiveSearch;
  const isPopoverFilterEmpty =
    !hasNoGroups &&
    !hasNoMembers &&
    visibleMemberCount === 0 &&
    !hasActiveSearch &&
    hasPopoverFilters;
  const showFullPageEmpty = hasNoGroups || hasNoMembers;

  const visibleGroupIds = visibleGroups.map((group) => group.id);
  const allVisibleSelected =
    visibleGroups.length > 0 &&
    visibleGroupIds.every((groupId) => selectedGroupIds.has(groupId));
  const hasPartialVisibleSelection = visibleGroups.some((group) => {
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
      for (const group of visibleGroups) {
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
      for (const group of visibleGroups) {
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex w-full items-center gap-3">
              <div className="relative max-w-sm flex-1">
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
              </div>
              <MembersFiltersPopover groups={groups} control={filtersPopover} />
            </div>
          </div>
          <div className="overflow-x-auto rounded-md border border-border bg-background shadow-xs">
            <Table className="w-full min-w-4xl table-fixed">
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted!">
                  <TableHead className="w-8 min-w-8 px-3 text-center">
                    <MemberSelectionCheckbox
                      checked={allVisibleSelected}
                      indeterminate={
                        !allVisibleSelected && hasPartialVisibleSelection
                      }
                      label="Selecionar grupos exibidos"
                      onCheckedChange={toggleAllVisible}
                    />
                  </TableHead>
                  <TableHead className="min-w-60">Membro</TableHead>
                  <TableHead className="hidden w-36 min-w-36 whitespace-nowrap px-2 text-center md:table-cell">
                    Entrada
                  </TableHead>
                  <TableHead className="hidden w-36 min-w-36 whitespace-nowrap px-2 text-center md:table-cell">
                    Saída
                  </TableHead>
                  <TableHead className="w-40 min-w-40 whitespace-nowrap px-2 text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-36 min-w-36 px-2 text-center">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {visibleGroups.map((group) => {
                  const groupMemberKeys = getGroupMemberKeys(group);
                  const selectedMembersInGroup = groupMemberKeys.filter((key) =>
                    selectedMemberKeys.has(key),
                  ).length;
                  const isGroupSelected = selectedGroupIds.has(group.id);
                  const isGroupIndeterminate =
                    !isGroupSelected && selectedMembersInGroup > 0;

                  return (
                    <Fragment key={group.id}>
                      <TableRow className="bg-muted/40 hover:bg-muted/50">
                        <TableCell className="w-8 min-w-8 px-3 text-center">
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
                        <TableCell className="w-40 min-w-40 py-3 text-center">
                          <Badge
                            variant="outline"
                            className="mx-auto w-max whitespace-nowrap"
                          >
                            {formatGroupMemberStatusSummary(group.members)}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-36 min-w-36 py-3 text-center">
                          <div className="flex justify-end">
                            <RefreshGroupButton
                              groupId={group.id}
                              groupTitle={group.title ?? undefined}
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
                                  "w-8 min-w-8 px-3 text-center",
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
                                  "overflow-hidden py-2 pl-8",
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
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <div className="min-w-0 max-w-40 overflow-hidden">
                                        <TruncatedTextTooltip
                                          text={displayName}
                                          variant="truncate"
                                          className="font-medium text-foreground"
                                        />
                                      </div>
                                      <div className="flex shrink-0 items-center gap-1.5">
                                        {isMemberOwner(member) ? (
                                          <MemberOwnerBadge />
                                        ) : null}
                                        <MemberStripePayerBadge
                                          plans={member.linkedStripePlans}
                                        />
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
                                  "w-40 min-w-40 text-center align-middle",
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
                                  "w-36 min-w-36 py-2 align-middle",
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
                                          telegramUserId: member.telegramUserId,
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

                {isSearchEmpty ||
                (isPopoverFilterEmpty && visibleGroups.length === 0) ? (
                  <TableRow className="hover:bg-background">
                    <TableCell colSpan={6} className="p-0">
                      <MembersEmptyState
                        embedded
                        hasNoGroups={false}
                        hasNoMembers={false}
                        isSearchEmpty={isSearchEmpty}
                        isPopoverFilterEmpty={isPopoverFilterEmpty}
                        onClearSearch={clearSearch}
                        onClearPopoverFilters={filtersPopover.clear}
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
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
        onSent={() => router.refresh()}
      />

      {!showFullPageEmpty ? (
        <p
          className={cn(
            "text-center text-muted-foreground text-xs",
            selectionSummary.count > 0 && "pb-16",
          )}
        >
          Exibindo{" "}
          <strong className="font-medium text-foreground">
            {visibleMemberCount}
          </strong>{" "}
          de{" "}
          <strong className="font-medium text-foreground">
            {totalMemberCount}
          </strong>{" "}
          membro{totalMemberCount === 1 ? "" : "s"} rastreado
          {totalMemberCount === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}

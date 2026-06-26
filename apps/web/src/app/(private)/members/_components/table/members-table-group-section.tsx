"use client";

import { memo, useCallback, useMemo } from "react";
import { ImageComponent } from "@/components/image-component";
import { RefreshGroupButton } from "@/components/refresh-group-button";
import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { withCacheBuster } from "@/lib/utils";
import {
  formatGroupMemberStatusSummary,
  getMemberKey,
  type MemberSummary,
  type VisibleGroup,
} from "../members-table-helpers";
import { GroupMembersPagination } from "./group-members-pagination";
import { MemberSelectionCheckbox } from "./member-selection-checkbox";
import { MembersTableMemberRow } from "./members-table-member-row";

type MembersTableGroupSectionProps = {
  group: VisibleGroup;
  isGroupSelected: boolean;
  memberSelectionFingerprint: string;
  isMemberKeySelected: (memberKey: string) => boolean;
  onToggleGroup: (groupId: string, checked: boolean) => void;
  onToggleMember: (
    groupId: string,
    member: MemberSummary,
    checked: boolean,
  ) => void;
  onSendMemberNotice: (telegramUserId: string, displayName: string) => void;
  onGroupMembersPageChange: (groupId: string, page: number) => void;
  onGroupDataSynced: () => void;
  showDataRefresh: boolean;
};

function countSelectedMembersInGroup(
  group: VisibleGroup,
  isMemberKeySelected: (memberKey: string) => boolean,
) {
  let count = 0;
  for (const member of group.visibleMembers) {
    if (isMemberKeySelected(getMemberKey(group.id, member.telegramUserId))) {
      count += 1;
    }
  }
  return count;
}

export const MembersTableGroupSection = memo(function MembersTableGroupSection({
  group,
  isGroupSelected,
  memberSelectionFingerprint: _memberSelectionFingerprint,
  isMemberKeySelected,
  onToggleGroup,
  onToggleMember,
  onSendMemberNotice,
  onGroupMembersPageChange,
  onGroupDataSynced,
  showDataRefresh,
}: MembersTableGroupSectionProps) {
  const selectedMembersInGroup = useMemo(() => {
    if (isGroupSelected) {
      return 0;
    }
    return countSelectedMembersInGroup(group, isMemberKeySelected);
  }, [group, isGroupSelected, isMemberKeySelected]);
  const isGroupIndeterminate = !isGroupSelected && selectedMembersInGroup > 0;

  const handleToggleGroup = useCallback(
    (checked: boolean) => {
      onToggleGroup(group.id, checked);
    },
    [group.id, onToggleGroup],
  );

  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/50">
        <TableCell className="w-8 min-w-8 px-2 text-center sm:px-3">
          <MemberSelectionCheckbox
            checked={isGroupSelected}
            indeterminate={isGroupIndeterminate}
            label={`Selecionar grupo ${group.title ?? group.telegramChatId}`}
            onCheckedChange={handleToggleGroup}
          />
        </TableCell>
        <TableCell className="overflow-hidden py-3">
          <div className="flex min-w-0 gap-3">
            <ImageComponent
              src={
                group.chatPhotoUrl
                  ? withCacheBuster(group.chatPhotoUrl, group.updatedAt)
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
          <Badge variant="outline" className="mx-auto w-max whitespace-nowrap">
            {formatGroupMemberStatusSummary(group)}
          </Badge>
        </TableCell>
        <TableCell className="w-28 min-w-28 py-3 text-center sm:w-36 sm:min-w-36">
          <div className="flex justify-end">
            <RefreshGroupButton
              groupId={group.id}
              groupTitle={group.title ?? undefined}
              onSynced={onGroupDataSynced}
            />
          </div>
        </TableCell>
      </TableRow>

      {group.visibleMembers.length === 0 ? (
        <TableRow>
          <TableCell colSpan={6} className="text-muted-foreground text-sm">
            Nenhum membro encontrado neste grupo.
          </TableCell>
        </TableRow>
      ) : (
        group.visibleMembers.map((member) => {
          const memberKey = getMemberKey(group.id, member.telegramUserId);
          const isCheckboxChecked =
            isGroupSelected || isMemberKeySelected(memberKey);

          return (
            <MembersTableMemberRow
              key={memberKey}
              groupId={group.id}
              member={member}
              isCheckboxChecked={isCheckboxChecked}
              onToggleMember={onToggleMember}
              onSendMemberNotice={onSendMemberNotice}
            />
          );
        })
      )}

      <TableRow className="hover:bg-background!">
        <TableCell colSpan={6} className="p-0 hover:bg-transparent!">
          <GroupMembersPagination
            group={group}
            disabled={showDataRefresh}
            onPageChange={onGroupMembersPageChange}
          />
        </TableCell>
      </TableRow>
    </>
  );
}, areGroupSectionPropsEqual);

function areGroupSectionPropsEqual(
  prev: MembersTableGroupSectionProps,
  next: MembersTableGroupSectionProps,
): boolean {
  if (prev.group !== next.group) {
    return false;
  }
  if (prev.isGroupSelected !== next.isGroupSelected) {
    return false;
  }
  if (prev.showDataRefresh !== next.showDataRefresh) {
    return false;
  }
  if (prev.isGroupSelected && next.isGroupSelected) {
    return true;
  }
  return prev.memberSelectionFingerprint === next.memberSelectionFingerprint;
}

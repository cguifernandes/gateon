"use client";

import { memo, useCallback } from "react";
import { ImageComponent } from "@/components/image-component";
import { MemberActionsToolbar } from "@/components/member-actions-toolbar";
import { MemberOwnerBadge } from "@/components/member-owner-badge";
import { MemberStripeBadges } from "@/components/member-stripe-badges";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { getTrackedMemberStatusDisplay } from "@/lib/telegram/bot-status";
import { cn } from "@/lib/utils";
import {
  formatMemberDate,
  getMemberDisplayName,
  getMemberInitials,
  isMemberLeft,
  isMemberOwner,
  type MemberSummary,
} from "../members-table-helpers";
import { MemberSelectionCheckbox } from "./member-selection-checkbox";

type MembersTableMemberRowContentProps = {
  groupId: string;
  member: MemberSummary;
  onSendMemberNotice: (telegramUserId: string, displayName: string) => void;
};

const MembersTableMemberRowContent = memo(
  function MembersTableMemberRowContent({
    groupId,
    member,
    onSendMemberNotice,
  }: MembersTableMemberRowContentProps) {
    const displayName = getMemberDisplayName(member);
    const memberLeft = isMemberLeft(member);
    const memberStatusDisplay = getTrackedMemberStatusDisplay(
      memberLeft ? "left" : "active",
    );
    const memberRowMutedClass = memberLeft ? "opacity-40" : undefined;

    return (
      <>
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
                  <p className="truncate font-medium text-foreground">
                    {displayName}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {isMemberOwner(member) ? <MemberOwnerBadge /> : null}
                  <MemberStripeBadges plans={member.linkedStripePlans} />
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
          {member.leftAt ? formatMemberDate(member.leftAt) : "-"}
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
            groupId={groupId}
            telegramUserId={member.telegramUserId}
            displayName={displayName}
            isInactive={memberLeft}
            isOwner={member.isOwner}
            onSendNotice={() =>
              onSendMemberNotice(member.telegramUserId, displayName)
            }
          />
        </TableCell>
      </>
    );
  },
);

type MembersTableMemberRowProps = {
  groupId: string;
  member: MemberSummary;
  isCheckboxChecked: boolean;
  onToggleMember: (
    groupId: string,
    member: MemberSummary,
    checked: boolean,
  ) => void;
  onSendMemberNotice: (telegramUserId: string, displayName: string) => void;
};

export const MembersTableMemberRow = memo(
  function MembersTableMemberRow({
    groupId,
    member,
    isCheckboxChecked,
    onToggleMember,
    onSendMemberNotice,
  }: MembersTableMemberRowProps) {
    const memberLeft = isMemberLeft(member);
    const memberRowMutedClass = memberLeft ? "opacity-40" : undefined;
    const displayName = getMemberDisplayName(member);

    const handleToggle = useCallback(
      (checked: boolean) => {
        onToggleMember(groupId, member, checked);
      },
      [groupId, member, onToggleMember],
    );

    return (
      <TableRow
        data-state={isCheckboxChecked ? "selected" : undefined}
        className="group/row transition-colors hover:bg-muted/50"
      >
        <TableCell
          className={cn(
            "w-8 min-w-8 px-2 text-center sm:px-3",
            memberRowMutedClass,
          )}
        >
          <MemberSelectionCheckbox
            checked={isCheckboxChecked}
            label={`Selecionar ${displayName}`}
            onCheckedChange={handleToggle}
          />
        </TableCell>
        <MembersTableMemberRowContent
          groupId={groupId}
          member={member}
          onSendMemberNotice={onSendMemberNotice}
        />
      </TableRow>
    );
  },
  (prev, next) =>
    prev.groupId === next.groupId &&
    prev.member === next.member &&
    prev.isCheckboxChecked === next.isCheckboxChecked,
);

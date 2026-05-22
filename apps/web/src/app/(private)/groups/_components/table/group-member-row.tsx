"use client";

import type { z } from "zod";
import { MemberActionsToolbar } from "@/components/member-actions-toolbar";
import { MemberOwnerBadge } from "@/components/member-owner-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { telegramGroupChatMemberSchema } from "@/lib/zod/telegram-group-connection-schemas";

export type GroupMemberRowData = z.infer<typeof telegramGroupChatMemberSchema>;

type GroupMemberRowProps = {
  groupId: string;
  member: GroupMemberRowData;
  displayName: string;
  formatDateTime: (value: string) => string;
  onMemberUpdated?: () => void;
};

function getMemberInitials(member: GroupMemberRowData) {
  const letter =
    member.firstName?.[0] ?? member.lastName?.[0] ?? member.telegramUserId[0] ?? "?";
  return letter.toUpperCase();
}

export function GroupMemberRow({
  groupId,
  member,
  displayName,
  formatDateTime,
  onMemberUpdated,
}: GroupMemberRowProps) {
  const isInactive = member.status === "left";

  return (
    <li className="group relative rounded-lg border border-border bg-card p-2.5">
      <div
        className={cn(
          "flex min-w-0 gap-3 pr-1 transition-opacity",
          isInactive && "opacity-40",
        )}
      >
        <Avatar className="size-9 shrink-0">
          {member.profilePhotoUrl ? (
            <AvatarImage src={member.profilePhotoUrl} alt={displayName} />
          ) : null}
          <AvatarFallback className="text-xs font-semibold uppercase">
            {getMemberInitials(member)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="flex items-center gap-1 truncate font-medium text-foreground text-sm">
            {displayName}
            {member.isOwner ? <MemberOwnerBadge /> : null}
            <Badge
              variant="outline"
              className={cn(
                "h-4 w-max shrink-0 gap-1.5 px-1.5 text-[10px] font-medium whitespace-nowrap",
                isInactive
                  ? "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                  : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
              )}
            >
              {isInactive ? "Saiu" : "Ativo"}
            </Badge>
          </p>
          <p className="truncate text-muted-foreground text-xs">
            {`Entrou em ${formatDateTime(member.joinedAt)}`}
          </p>
        </div>
      </div>

      <MemberActionsToolbar
        groupId={groupId}
        telegramUserId={member.telegramUserId}
        displayName={displayName}
        isInactive={isInactive}
        isOwner={member.isOwner}
        variant="overlay"
        onActionSuccess={onMemberUpdated}
      />
    </li>
  );
}

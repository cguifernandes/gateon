"use client";

import { useMemo, useRef, useState } from "react";
import type { z } from "zod";
import {
  getMemberDisplayName,
  memberMatchesSearch,
} from "@/app/(private)/members/_components/members-table-helpers";
import { SearchIcon, type SearchIconHandle } from "@/components/icons/search";
import { MemberActionsToolbar } from "@/components/member-actions-toolbar";
import { MemberOwnerBadge } from "@/components/member-owner-badge";
import { MemberStripePayerBadge } from "@/components/member-stripe-payer-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getTrackedMemberStatusDisplay } from "@/lib/telegram-bot-status";
import { cn } from "@/lib/utils";
import type { telegramGroupChatMemberSchema } from "@/lib/zod/telegram-group-connection-schemas";

export type GroupMemberRowData = z.infer<typeof telegramGroupChatMemberSchema>;

type GroupMemberRowProps = {
  groupId: string;
  member: GroupMemberRowData;
  displayName: string;
  formatDateTime: (value: string) => string;
  onMemberUpdated?: () => void;
  onSendNotice?: () => void;
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
  onSendNotice,
}: GroupMemberRowProps) {
  const isInactive = member.status === "left";
  const statusDisplay = getTrackedMemberStatusDisplay(
    isInactive ? "left" : "active",
  );

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
            <MemberStripePayerBadge plans={member.linkedStripePlans} />
            <Badge
              variant="outline"
              className={cn(
                "h-4 w-max shrink-0 gap-1.5 px-1.5 text-[10px] font-medium whitespace-nowrap",
                statusDisplay.className,
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
        onSendNotice={onSendNotice}
      />
    </li>
  );
}

function formatTrackedMembersHeading(activeCount: number, leftCount: number) {
  const leftSuffix = leftCount > 0 ? `, ${leftCount} saíram` : "";
  return `Membros rastreados (${activeCount} ativos${leftSuffix})`;
}

type GroupMembersListProps = {
  groupId: string;
  members: GroupMemberRowData[];
  formatDateTime: (value: string) => string;
  onMemberUpdated?: () => void;
  onSendMemberNotice?: (target: {
    telegramUserId: string;
    displayName: string;
  }) => void;
};

export function GroupMembersList({
  groupId,
  members,
  formatDateTime,
  onMemberUpdated,
  onSendMemberNotice,
}: GroupMembersListProps) {
  const [search, setSearch] = useState("");
  const searchIconRef = useRef<SearchIconHandle>(null);
  const query = search.trim().toLowerCase();

  const filteredMembers = useMemo(() => {
    if (!query) {
      return members;
    }
    return members.filter((member) => memberMatchesSearch(member, query));
  }, [members, query]);

  const activeCount = filteredMembers.filter(
    (member) => member.status === "active",
  ).length;
  const leftCount = filteredMembers.filter(
    (member) => member.status === "left",
  ).length;
  const isSearchEmpty = query.length > 0 && filteredMembers.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full">
        <SearchIcon
          ref={searchIconRef}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          size={16}
        />
        <Input
          placeholder="Pesquisar por membro ou ID"
          type="search"
          value={search}
          className="pl-9"
          onFocus={() => searchIconRef.current?.startAnimation()}
          onBlur={() => searchIconRef.current?.stopAnimation()}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <h3 className="font-semibold text-foreground text-sm">
        {formatTrackedMembersHeading(activeCount, leftCount)}
        {query ? (
          <span className="font-normal text-muted-foreground">
            {" "}
            · {filteredMembers.length} de {members.length}
          </span>
        ) : null}
      </h3>

      {isSearchEmpty ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-4 text-xs">
          <p className="text-muted-foreground">
            Nenhum membro encontrado para &quot;{search.trim()}&quot;.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setSearch("")}
          >
            Limpar busca
          </Button>
        </div>
      ) : (
        <TooltipProvider>
          <ul className="space-y-2 pb-2">
            {filteredMembers.map((member) => (
              <GroupMemberRow
                key={member.telegramUserId}
                groupId={groupId}
                member={member}
                displayName={getMemberDisplayName(member)}
                formatDateTime={formatDateTime}
                onMemberUpdated={onMemberUpdated}
                onSendNotice={
                  onSendMemberNotice
                    ? () =>
                        onSendMemberNotice({
                          telegramUserId: member.telegramUserId,
                          displayName: getMemberDisplayName(member),
                        })
                    : undefined
                }
              />
            ))}
          </ul>
        </TooltipProvider>
      )}
    </div>
  );
}

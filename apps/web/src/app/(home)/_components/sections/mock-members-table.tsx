"use client";

import React, { useMemo } from "react";
import {
  formatGroupMemberStatusSummary,
  formatMemberDate,
  getMemberDisplayName,
  isMemberLeft,
  type VisibleGroup,
} from "@/app/(private)/members/_components/members-table-helpers";
import { MemberSelectionCheckbox } from "@/app/(private)/members/_components/table/member-selection-checkbox";
import { ImageComponent } from "@/components/image-component";
import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTrackedMemberStatusDisplay } from "@/lib/telegram/bot-status";
import { cn, withCacheBuster } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

type MockMembersTableProps = {
  initialGroups: TelegramGroupSummaryDto[];
};

export function MockMembrsTable({ initialGroups }: MockMembersTableProps) {
  const visibleGroups = useMemo<VisibleGroup[]>(
    () =>
      initialGroups.map((group) => ({
        ...group,
        visibleMembers: group.members,
      })),
    [initialGroups],
  );

  return (
    <div className="lg:absolute flex flex-col gap-3">
      <div className="relative overflow-x-auto rounded-md border border-border bg-background shadow-xs">
        <div className={cn("transition-opacity")}>
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted!">
                <TableHead className="w-8 min-w-8 px-2 text-center sm:px-3">
                  <MemberSelectionCheckbox
                    checked={false}
                    label="Selecionar grupos exibidos"
                    onCheckedChange={() => {}}
                    className="size-3 pointer-events-none"
                  />
                </TableHead>
                <TableHead className="w-40 text-[10px]">Membro</TableHead>
                <TableHead className="w-36 text-[10px] min-w-36 whitespace-nowrap px-2 text-center">
                  Entrada
                </TableHead>
                <TableHead className="w-36 text-[10px] min-w-36 whitespace-nowrap px-2 text-center">
                  Saída
                </TableHead>
                <TableHead className="w-40 text-[10px] min-w-40 whitespace-nowrap px-2 text-center">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visibleGroups.map((group) => (
                <React.Fragment key={group.id}>
                  <TableRow className="bg-muted/40 hover:bg-muted/50">
                    <TableCell className="w-8 min-w-8 px-2 text-center sm:px-3">
                      <MemberSelectionCheckbox
                        className="size-3 pointer-events-none"
                        checked={false}
                        label={`Selecionar grupo ${group.title ?? group.telegramChatId}`}
                        onCheckedChange={() => {}}
                      />
                    </TableCell>
                    <TableCell className="overflow-hidden py-2">
                      <div className="flex items-center min-w-0 gap-3">
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
                          width={28}
                          height={28}
                          sizes="28px"
                          avatarFallbackClassName="text-[10px]!"
                          className="size-[28px] shrink-0 rounded-full border border-border object-cover"
                        />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <TruncatedTextTooltip
                            text={group.title ?? "Grupo sem nome"}
                            variant="truncate"
                            className="font-heading text-[10px] font-semibold text-foreground"
                          />
                          <p className="truncate text-muted-foreground text-[9px]">
                            {group.telegramChatId}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="w-36 min-w-36 py-2" />
                    <TableCell className="w-36 min-w-36 py-2" />
                    <TableCell className="w-40 min-w-40 py-2 text-center">
                      <Badge
                        variant="outline"
                        className="mx-auto w-max text-[9px] whitespace-nowrap"
                      >
                        {formatGroupMemberStatusSummary(group)}
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {group.visibleMembers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-muted-foreground text-sm"
                      >
                        Nenhum membro encontrado neste grupo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    group.visibleMembers.map((member) => {
                      const displayName = getMemberDisplayName(member);
                      const memberLeft = isMemberLeft(member);
                      const memberStatusDisplay = getTrackedMemberStatusDisplay(
                        memberLeft ? "left" : "active",
                      );

                      return (
                        <TableRow
                          key={`${member.firstName}${member.lastName}`}
                          className="group/row transition-colors hover:bg-transparent!"
                        >
                          <TableCell
                            className={cn(
                              "w-8 min-w-8 px-2 text-center sm:px-3",
                            )}
                          >
                            <MemberSelectionCheckbox
                              checked={false}
                              label={`Selecionar ${member.firstName}`}
                              onCheckedChange={() => {}}
                              className="size-3 pointer-events-none"
                            />
                          </TableCell>

                          <TableCell
                            className={cn("overflow-hidden py-2 pl-4 sm:pl-8")}
                          >
                            <div className="flex min-w-0 gap-3">
                              <ImageComponent
                                src={member.profilePhotoUrl ?? null}
                                alt={displayName}
                                width={24}
                                height={24}
                                sizes="24px"
                                avatarFallbackClassName="text-[10px]!"
                                className="size-[24px] shrink-0 rounded-full border border-border object-cover"
                              />
                              <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
                                <div className="flex min-w-0 flex-wrap items-center gap-1">
                                  <div className="min-w-0 max-w-full overflow-hidden sm:max-w-40">
                                    <p className="truncate text-[10px] font-medium text-foreground">
                                      {displayName}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
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
                                <span className="truncate text-[9px] text-muted-foreground text-xs">
                                  {member.telegramUserId}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "w-36 min-w-36 text-[10px] text-center whitespace-nowrap text-muted-foreground align-middle",
                            )}
                          >
                            {formatMemberDate(member.joinedAt)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "w-36 min-w-36 text-[10px] text-center whitespace-nowrap text-muted-foreground align-middle",
                            )}
                          >
                            {member.leftAt
                              ? formatMemberDate(member.leftAt)
                              : "-"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "w-40 min-w-40 text-center align-middle",
                            )}
                          >
                            <Badge
                              variant="outline"
                              className={cn(
                                "mx-auto w-max shrink-0 text-[9px] gap-1.5 font-medium whitespace-nowrap",
                                memberStatusDisplay.className,
                              )}
                            >
                              {memberLeft ? "Saiu" : "Ativo"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

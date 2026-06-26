"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ImageComponent } from "@/components/image-component";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTrackedMemberStatusDisplay } from "@/lib/telegram/bot-status";
import { cn } from "@/lib/utils";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { useDashboardFilters } from "./dashboard-filters-context";
import {
  getMemberMovementBadgeKind,
  getMemberMovementPeriodSummary,
  getMemberMovementsInRange,
  getPresetRange,
  type MemberMovementBadgeKind,
  type MemberMovementRow,
} from "./dashboard-insights-utils";

const MOVEMENT_BADGE_LABELS: Record<MemberMovementBadgeKind, string> = {
  entrada: "Entrada",
  "entrada-e-saida": "Entrada e saída",
  saida: "Saída",
};

function getMemberMovementBadge(row: MemberMovementRow) {
  const kind = getMemberMovementBadgeKind(row);

  return {
    label: MOVEMENT_BADGE_LABELS[kind],
    display: getTrackedMemberStatusDisplay(
      kind === "entrada" ? "active" : "left",
    ),
  };
}

function formatMovementDate(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `há ${diffDays}d`;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type DashboardGroupMemberActivityTableProps = {
  groups: TelegramGroupSummaryDto[];
};

export function DashboardGroupMemberActivityTable({
  groups,
}: DashboardGroupMemberActivityTableProps) {
  const { datePreset, selectedGroupId } = useDashboardFilters();
  const range = getPresetRange(datePreset);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? groups[0],
    [groups, selectedGroupId],
  );

  const summary = useMemo(() => {
    if (!selectedGroup) return null;
    return getMemberMovementPeriodSummary(selectedGroup, range);
  }, [range, selectedGroup]);

  const rows = useMemo(() => {
    if (!selectedGroup) return [];
    return getMemberMovementsInRange(selectedGroup, range);
  }, [range, selectedGroup]);

  return (
    <Card className="flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="flex shrink-0 flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex flex-col gap-y-1">
          <CardTitle>Movimentação de membros</CardTitle>
          <CardDescription className="max-w-xl text-xs leading-relaxed">
            Membros que entraram ou saíram do grupo no período filtrado, com
            situação atual, tipo de evento e data.
          </CardDescription>
        </div>
        <Link
          href="/members"
          className={cn(
            buttonVariants({ variant: "link" }),
            "p-0 text-xs h-fit",
          )}
        >
          Ver membros
        </Link>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-0 py-0">
        {!selectedGroup ? (
          <div className="flex min-h-52 items-center justify-center px-5 text-muted-foreground text-sm">
            Nenhum grupo conectado.
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-52 items-center justify-center px-5 text-muted-foreground text-sm">
            Nenhuma entrada ou saída registrada neste período.
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Table className="table-fixed">
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow className="bg-muted hover:bg-muted!">
                  <TableHead className="w-[min(40%,280px)] bg-muted px-5">
                    Membro
                  </TableHead>
                  <TableHead className="w-36 bg-muted text-center">
                    Situação atual
                  </TableHead>
                  <TableHead className="w-40 bg-muted text-center">
                    Evento
                  </TableHead>
                  <TableHead className="w-36 bg-muted px-5 text-right">
                    Quando ocorreu
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const movementBadge = getMemberMovementBadge(row);
                  const currentStatusDisplay = getTrackedMemberStatusDisplay(
                    row.isActiveNow ? "active" : "left",
                  );
                  const contentMutedClass = row.isActiveNow
                    ? undefined
                    : "opacity-40";

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="px-5">
                        <div
                          className={cn(
                            "flex min-w-0 items-center gap-3",
                            contentMutedClass,
                          )}
                        >
                          <ImageComponent
                            src={row.profilePhotoUrl}
                            alt={row.displayName}
                            width={32}
                            height={32}
                            sizes="32px"
                            className="size-8 shrink-0 rounded-full border border-border object-cover"
                            avatarFallbackClassName="text-xs"
                          />
                          <span className="truncate font-medium text-foreground">
                            {row.displayName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={contentMutedClass}>
                          <Badge
                            variant="outline"
                            className={cn(
                              "mx-auto w-max shrink-0 gap-1.5 text-xs font-medium whitespace-nowrap",
                              currentStatusDisplay.className,
                            )}
                          >
                            {row.isActiveNow ? "No grupo" : "Fora do grupo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={contentMutedClass}>
                          <Badge
                            variant="outline"
                            className={cn(
                              "mx-auto w-max shrink-0 gap-1.5 text-xs font-medium whitespace-nowrap",
                              movementBadge.display.className,
                            )}
                          >
                            {movementBadge.label}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="px-5 text-right text-muted-foreground text-xs">
                        <span className={contentMutedClass}>
                          {formatMovementDate(row.occurredAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {summary ? (
        <CardFooter className="flex shrink-0 flex-wrap gap-x-2 gap-y-1 border-t border-border px-5 py-3 text-xs tabular-nums">
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {summary.entradas} entradas
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium text-muted-foreground">
            {summary.entradaESaida} entrada e saída
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium text-amber-600 dark:text-amber-400">
            {summary.saidas} saídas
          </span>
        </CardFooter>
      ) : null}
    </Card>
  );
}

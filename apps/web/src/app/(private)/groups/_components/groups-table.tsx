"use client";

import { useMemo, useState } from "react";
import { SettingsIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { GroupStatusBadge } from "./group-status-badge";
import { RemoveGroupDialog } from "./remove-group-dialog";

const MAX_GROUPS = 5;

type StatusFilter = "all" | "active" | "inactive" | "error";

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Todos",
  active: "Ativos",
  inactive: "Inativos",
  error: "Com erro",
};

function matchesStatusFilter(
  botStatus: string,
  filter: StatusFilter,
): boolean {
  if (filter === "all") return true;
  const s = botStatus.toLowerCase().replace(/_/g, "");
  if (filter === "active") {
    return s.includes("active") || s.includes("connect");
  }
  if (filter === "error") {
    return s.includes("fail") || s.includes("error");
  }
  if (filter === "inactive") {
    return (
      !s.includes("active") &&
      !s.includes("connect") &&
      !s.includes("fail") &&
      !s.includes("error")
    );
  }
  return true;
}

function formatTelegramMemberName(
  member: TelegramGroupSummaryDto["connectedBy"],
) {
  if (!member) return "—";
  const fullName = [member.firstName, member.lastName]
    .filter(Boolean)
    .join(" ");
  if (fullName) return fullName;
  return member.username ? `@${member.username}` : member.telegramUserId;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

type GroupsTableProps = {
  groups: TelegramGroupSummaryDto[];
  addGroupButton: React.ReactNode;
};

export function GroupsTable({ groups, addGroupButton }: GroupsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isAtLimit = groups.length >= MAX_GROUPS;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      const matchesSearch =
        !q ||
        (g.title ?? "").toLowerCase().includes(q) ||
        g.telegramChatId.toLowerCase().includes(q);
      const matchesStatus = matchesStatusFilter(g.botStatus, statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [groups, search, statusFilter]);

  return (
    <div className="flex flex-col gap-5">
      {/* Limit banner */}
      <div
        className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
          isAtLimit
            ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            : "border-border bg-muted/40 text-muted-foreground"
        }`}
      >
        <div className="flex items-center gap-2">
          <UsersIcon size={15} className="shrink-0" />
          <span>
            {isAtLimit ? (
              <>
                Você atingiu o limite de{" "}
                <strong className="font-semibold">{MAX_GROUPS} grupos</strong>{" "}
                do seu plano.{" "}
                <span className="underline underline-offset-2 cursor-pointer hover:opacity-80">
                  Faça upgrade para adicionar mais.
                </span>
              </>
            ) : (
              <>
                <strong className="font-semibold text-foreground">
                  {groups.length}/{MAX_GROUPS}
                </strong>{" "}
                grupos conectados no plano atual.
              </>
            )}
          </span>
        </div>
        {isAtLimit ? null : addGroupButton}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            fill="none"
            height={14}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
            width={14}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            className="pl-8 text-sm"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou ID…"
            value={search}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((key) => (
            <button
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              key={key}
              onClick={() => setStatusFilter(key)}
              type="button"
            >
              {STATUS_FILTER_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[220px] pl-4">Grupo</TableHead>
                <TableHead>Status do bot</TableHead>
                <TableHead>Membros</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Gateway
                </TableHead>
                <TableHead className="hidden md:table-cell">Conectado</TableHead>
                <TableHead className="hidden md:table-cell">
                  Conectado por
                </TableHead>
                <TableHead className="w-[100px] pr-4 text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((group) => (
                <TableRow
                  className="group/row transition-colors"
                  key={group.id}
                >
                  {/* Name + ID */}
                  <TableCell className="pl-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">
                        {group.title || "Grupo sem nome"}
                      </span>
                      <code className="w-fit rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {group.telegramChatId}
                      </code>
                    </div>
                  </TableCell>

                  {/* Bot status */}
                  <TableCell>
                    <GroupStatusBadge status={group.botStatus} />
                  </TableCell>

                  {/* Members */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground tabular-nums">
                        {group.memberCount ?? "—"}
                      </span>
                      {group.memberCount !== null ? (
                        <span className="text-xs text-muted-foreground">
                          membros
                        </span>
                      ) : null}
                    </div>
                  </TableCell>

                  {/* Gateway */}
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className="text-xs font-normal">
                      Não conectado
                    </Badge>
                  </TableCell>

                  {/* Connected at */}
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDate(group.connectedAt)}
                  </TableCell>

                  {/* Connected by */}
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatTelegramMemberName(group.connectedBy)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        className="size-8 text-muted-foreground hover:text-foreground"
                        size="icon"
                        title="Configurar grupo"
                        variant="ghost"
                      >
                        <SettingsIcon size={15} />
                        <span className="sr-only">Configurar</span>
                      </Button>

                      <RemoveGroupDialog
                        groupId={group.id}
                        groupTitle={group.title ?? ""}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState hasGroups={groups.length > 0} isFiltered={!!search || statusFilter !== "all"} />
      )}

      {/* Results count */}
      {filtered.length > 0 && groups.length > 1 && (
        <p className="text-center text-xs text-muted-foreground">
          Exibindo{" "}
          <strong className="font-medium text-foreground">
            {filtered.length}
          </strong>{" "}
          de{" "}
          <strong className="font-medium text-foreground">
            {groups.length}
          </strong>{" "}
          grupo{groups.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

function EmptyState({
  hasGroups,
  isFiltered,
}: {
  hasGroups: boolean;
  isFiltered: boolean;
}) {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <svg
            className="text-muted-foreground"
            fill="none"
            height={20}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
            width={20}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-foreground">
            Nenhum grupo encontrado
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente ajustar os filtros ou o termo de busca.
          </p>
        </div>
      </div>
    );
  }

  if (!hasGroups) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <UsersIcon className="text-primary" size={24} />
        </div>
        <div className="max-w-xs">
          <p className="font-semibold text-foreground text-base">
            Nenhum grupo conectado ainda
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            Conecte seu primeiro grupo do Telegram para começar a gerenciar
            membros e assinaturas automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

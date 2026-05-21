"use client";

import { InfoIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderIcon } from "@/components/icons/loader";
import {
  RefreshCWIcon,
  type RefreshCWIconHandle,
} from "@/components/icons/refresh-cw";
import { XIcon, type XIconHandle } from "@/components/icons/x";
import { ImageComponent } from "@/components/image-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { getBotStatusDisplay } from "@/lib/telegram-bot-status";
import { cn, withCacheBuster } from "@/lib/utils";
import {
  type TelegramGroupMembersListResponseDto,
  type TelegramGroupSummaryDto,
  telegramGroupMembersListResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import { useRefreshTelegramGroup } from "../../_hooks/use-refresh-telegram-group";
import { RemoveGroupDialog } from "./remove-group-dialog";

type MemberRow = TelegramGroupMembersListResponseDto["members"][number];

function formatMemberName(
  member: Pick<
    MemberRow,
    "firstName" | "lastName" | "username" | "telegramUserId"
  >,
) {
  const fullName = [member.firstName, member.lastName]
    .filter(Boolean)
    .join(" ");
  if (fullName) return fullName;
  if (member.username) return `@${member.username}`;
  return member.telegramUserId;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getMemberUpdatedAt(
  member: MemberRow | TelegramGroupSummaryDto["members"][number],
): string | null {
  if (!("updatedAt" in member)) {
    return null;
  }
  const value = member.updatedAt;
  return typeof value === "string" ? value : null;
}

function getTelegramChatTypeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case "supergroup":
      return "Supergrupo";
    case "group":
      return "Grupo";
    case "channel":
      return "Canal";
    default:
      return type;
  }
}

type GroupMembersDrawerProps = {
  group: TelegramGroupSummaryDto;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function GroupMembersDrawer({
  group,
  open: openProp,
  onOpenChange,
  showTrigger = true,
}: GroupMembersDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const [data, setData] = useState<TelegramGroupMembersListResponseDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const xIconRef = useRef<XIconHandle>(null);
  const refreshIconRef = useRef<RefreshCWIconHandle>(null);
  const removeIconRef = useRef<XIconHandle>(null);

  const groupTitle = group.title ?? "";

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/telegram/groups/${encodeURIComponent(group.id)}/members`,
        { credentials: "include", cache: "no-store" },
      );

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Não foi possível carregar os membros.");
      }

      const raw: unknown = await res.json();
      const parsed = telegramGroupMembersListResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error("Resposta inválida do servidor.");
      }

      setData(parsed.data);
    } catch (err) {
      setData(null);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar membros.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [group.id]);

  const { refresh, isPending: isSyncing } = useRefreshTelegramGroup(
    group.id,
    groupTitle,
    {
      onSuccess: () => {
        void loadMembers();
      },
    },
  );

  function handleOpenChange(next: boolean) {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadMembers();
  }, [open, loadMembers]);

  const summary = {
    memberCount: data?.memberCount ?? group.memberCount,
    trackedMemberCount: data?.trackedMemberCount ?? group.trackedMemberCount,
    trackedMemberLimitPerGroup:
      data?.trackedMemberLimitPerGroup ?? group.trackedMemberLimitPerGroup,
    trackedMemberLimitReached:
      data?.trackedMemberLimitReached ?? group.trackedMemberLimitReached,
    leftMemberCount: data?.leftMemberCount,
    connectedAt: data?.connectedAt ?? group.connectedAt,
    lastSyncedAt: data?.lastSyncedAt ?? group.updatedAt,
  };

  const members = data?.members ?? group.members;
  const botDisplay = getBotStatusDisplay(group.botStatus);

  return (
    <Drawer direction="right" open={open} onOpenChange={handleOpenChange}>
      {showTrigger ? (
        <DrawerTrigger asChild>
          <Button
            type="button"
            variant="link"
            className="h-auto justify-start p-0 text-[10px] text-primary underline-offset-2"
          >
            Listar membros
          </Button>
        </DrawerTrigger>
      ) : null}
      <DrawerContent className="data-[vaul-drawer-direction=right]:h-full data-[vaul-drawer-direction=right]:max-h-none data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DrawerHeader className="relative shrink-0 border-b border-border text-left">
            <DrawerClose asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute top-4 right-4 size-8 shrink-0"
                aria-label="Fechar"
                onMouseEnter={() => xIconRef.current?.startAnimation()}
                onMouseLeave={() => xIconRef.current?.stopAnimation()}
              >
                <XIcon size={16} isAnimateOnView={false} ref={xIconRef} />
              </Button>
            </DrawerClose>
            <div className="flex flex-col gap-4">
              <div className="flex items-start pr-10 gap-3">
                <ImageComponent
                  src={withCacheBuster(
                    group.chatPhotoUrl ?? "",
                    group.updatedAt ?? "",
                  )}
                  alt={group.title || "Grupo sem nome"}
                  width={50}
                  height={50}
                  className="size-[50px] border border-border shrink-0 rounded-full object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <DrawerTitle className="max-w-full line-clamp-2 break-all">
                    {group.title || "Grupo sem nome"}
                  </DrawerTitle>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-[10px] font-medium",
                        botDisplay.className,
                      )}
                    >
                      {botDisplay.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-[10px] font-medium text-muted-foreground"
                    >
                      {getTelegramChatTypeLabel(group.type)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isSyncing || isLoading}
                  onClick={() => refresh()}
                  onMouseEnter={() => refreshIconRef.current?.startAnimation()}
                  onMouseLeave={() => refreshIconRef.current?.stopAnimation()}
                >
                  <RefreshCWIcon
                    ref={refreshIconRef}
                    size={14}
                    isAnimateOnView={false}
                    className={cn(
                      "text-muted-foreground",
                      isSyncing && "animate-spin",
                    )}
                  />
                  {isSyncing ? "Sincronizando…" : "Sincronizar dados"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  disabled={isSyncing || isLoading}
                  onClick={() => setRemoveOpen(true)}
                  onMouseEnter={() => removeIconRef.current?.startAnimation()}
                  onMouseLeave={() => removeIconRef.current?.stopAnimation()}
                >
                  <XIcon
                    ref={removeIconRef}
                    size={14}
                    isAnimateOnView={false}
                    className="text-destructive"
                  />
                  Desconectar
                </Button>
              </div>
            </div>
          </DrawerHeader>

          <div
            ref={scrollAreaRef}
            className="min-h-0 flex-1 flex flex-col gap-6 overflow-y-auto p-6"
          >
            <div className="flex w-full items-start gap-2 rounded-lg border border-border bg-muted p-3">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    Total no grupo
                  </span>{" "}
                  é a contagem que o Telegram reporta para este chat, atualizada
                  ao sincronizar. Pode ser maior que os gerenciados e incluir
                  pessoas que o Gateon ainda não registrou.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Gerenciados
                  </span>{" "}
                  são perfis que o bot já rastreou e que seguem no grupo,{" "}
                  <span className="font-medium">sem saída registrada</span>.
                  Entram na base quando o bot recebe o evento de entrada; contam
                  para o limite do plano neste grupo.
                </p>
                <p>
                  A lista{" "}
                  <span className="font-medium text-foreground">
                    Membros rastreados
                  </span>{" "}
                  abaixo mostra só esses gerenciados ativos. Quem sair ou for
                  removido deixa de aparecer aqui e passa a contar em{" "}
                  <span className="font-medium text-foreground">
                    Saíram do grupo
                  </span>
                  .
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border flex flex-col gap-y-0.5 border-border bg-card p-2.5">
                <dt className="text-muted-foreground font-heading">
                  Total no grupo
                </dt>
                <dd className="font-semibold text-foreground">
                  {summary.memberCount ?? "—"}
                </dd>
              </div>
              <div className="rounded-lg border flex flex-col gap-y-0.5 border-border bg-card p-2.5">
                <dt className="text-muted-foreground font-heading">
                  Gerenciados
                </dt>
                <dd
                  className={cn(
                    "font-semibold",
                    summary.trackedMemberLimitReached
                      ? "text-amber-600 dark:text-amber-500"
                      : "text-foreground",
                  )}
                >
                  {summary.trackedMemberCount} /{" "}
                  {summary.trackedMemberLimitPerGroup}
                </dd>
              </div>
              <div className="rounded-lg border flex flex-col gap-y-0.5 border-border bg-card p-2.5">
                <dt className="text-muted-foreground font-heading">
                  Saíram do grupo
                </dt>
                <dd className="font-semibold">
                  {summary.leftMemberCount ?? "—"}
                </dd>
              </div>
              <div className="rounded-lg border flex flex-col gap-y-0.5 border-border bg-card p-2.5">
                <dt className="text-muted-foreground font-heading">
                  Última sincronização
                </dt>
                <dd className="font-semibold">
                  {formatDateTime(summary.lastSyncedAt)}
                </dd>
              </div>
              <div className="col-span-2 rounded-lg border flex flex-col gap-y-0.5 border-border bg-card p-2.5">
                <dt className="text-muted-foreground font-heading">
                  Conectado em
                </dt>
                <dd className="font-semibold">
                  {formatDateTime(summary.connectedAt)}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Membros rastreados ({members.length})
              </h3>

              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <LoaderIcon size={18} />
                  Carregando lista…
                </div>
              ) : null}

              {error ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-xs">
                  {error}
                </p>
              ) : null}

              {!isLoading && !error && members.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Nenhum membro rastreado ainda. Entradas no grupo passam a
                  aparecer aqui quando o bot receber os eventos do Telegram.
                </p>
              ) : null}

              {!isLoading && !error && members.length > 0 ? (
                <ul className="space-y-2 pb-2">
                  {members.map((member) => {
                    const updatedAt = getMemberUpdatedAt(member);
                    return (
                      <li
                        key={member.telegramUserId}
                        className="flex gap-3 rounded-lg border border-border bg-card p-2.5"
                      >
                        {member.profilePhotoUrl ? (
                          <Image
                            src={member.profilePhotoUrl}
                            alt=""
                            width={40}
                            height={40}
                            className="size-10 shrink-0 rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                            {(
                              member.firstName?.[0] ??
                              member.username?.[0] ??
                              "?"
                            ).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="truncate font-medium text-foreground text-sm">
                            {formatMemberName(member)}
                          </p>
                          {member.username ? (
                            <p className="truncate text-muted-foreground text-xs">
                              @{member.username}
                            </p>
                          ) : null}
                          <p className="truncate font-mono text-[10px] text-muted-foreground">
                            ID {member.telegramUserId}
                          </p>
                          {updatedAt ? (
                            <p className="text-[10px] text-muted-foreground">
                              Atualizado em {formatDateTime(updatedAt)}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </DrawerContent>

      <RemoveGroupDialog
        groupId={group.id}
        groupTitle={groupTitle}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        onRemoved={() => handleOpenChange(false)}
      />
    </Drawer>
  );
}

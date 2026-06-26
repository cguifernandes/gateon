"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TelegramGroupTypeBadges } from "@/app/(private)/groups/_components/table/telegram-group-type-badges";
import {
  type RefreshTelegramGroupResult,
  useRefreshTelegramGroup,
} from "@/app/(private)/groups/_hooks/use-refresh-telegram-group";
import { BadgeAlertIcon } from "@/components/icons/badge-alert";
import { LoaderIcon } from "@/components/icons/loader";
import {
  MessageCircleIcon,
  type MessageCircleIconHandle,
} from "@/components/icons/message-circle";
import {
  RefreshCWIcon,
  type RefreshCWIconHandle,
} from "@/components/icons/refresh-cw";
import {
  SettingsIcon,
  type SettingsIconHandle,
} from "@/components/icons/settings";
import { XIcon, type XIconHandle } from "@/components/icons/x";
import { ImageComponent } from "@/components/image-component";
import type { QuickNoticePayload } from "@/components/quick-notice-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { getBotStatusDisplay } from "@/lib/telegram/bot-status";
import { cn, withCacheBuster } from "@/lib/utils";
import {
  type TelegramGroupMembersListResponseDto,
  type TelegramGroupSummaryDto,
  telegramGroupMembersListResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import { type GroupMemberRowData, GroupMembersList } from "./group-member-row";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

type MembersSummary = {
  memberCount: number | null | undefined;
  trackedMemberCount: number;
  trackedMemberLimitPerGroup: number;
  trackedMemberLimitReached: boolean;
  leftMemberCount: number;
  connectedAt: string;
  lastSyncedAt: string;
};

type MembersContentState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "list" };

function resolveMembersContentState(
  isLoading: boolean,
  error: string | null,
  memberCount: number,
): MembersContentState {
  if (isLoading) {
    return { kind: "loading" };
  }
  if (error) {
    return { kind: "error", message: error };
  }
  if (memberCount === 0) {
    return { kind: "empty" };
  }
  return { kind: "list" };
}

function MembersInfoCallout() {
  return (
    <div className="p-6">
      <div className="flex w-full items-start gap-2 rounded-lg border border-border bg-muted p-3">
        <BadgeAlertIcon size={20} className="mt-0.5 shrink-0 text-primary" />
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Total no grupo</span>{" "}
            — todos os membros do chat segundo o Telegram (bots inclusos). O
            Gateon só exibe esse número e não gerencia.
          </p>
          <p>
            <span className="font-medium text-foreground">Gerenciados</span> —
            perfis que o bot registrou e que ainda estão no grupo. São os da
            lista{" "}
            <span className="font-medium font-heading text-foreground">
              Membros rastreados
            </span>
            , contam no limite do plano e, ao sair, deixam de aparecer e passam
            para{" "}
            <span className="font-medium text-foreground">Saíram do grupo</span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function MembersSummaryGrid({ summary }: { summary: MembersSummary }) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-xs">
      <div className="flex flex-col gap-y-0.5 rounded-lg border border-border bg-card p-2.5">
        <dt className="font-heading text-muted-foreground">Total no grupo</dt>
        <dd className="font-semibold text-foreground">
          {summary.memberCount ?? "—"}
        </dd>
      </div>
      <div className="flex flex-col gap-y-0.5 rounded-lg border border-border bg-card p-2.5">
        <dt className="font-heading text-muted-foreground">Gerenciados</dt>
        <dd
          className={cn(
            "font-semibold",
            summary.trackedMemberLimitReached
              ? "text-amber-600 dark:text-amber-500"
              : "text-foreground",
          )}
        >
          {summary.trackedMemberCount} / {summary.trackedMemberLimitPerGroup}
        </dd>
      </div>
      <div className="flex flex-col gap-y-0.5 rounded-lg border border-border bg-card p-2.5">
        <dt className="font-heading text-muted-foreground">Saíram do grupo</dt>
        <dd className="font-semibold text-foreground">
          {summary.leftMemberCount}
        </dd>
      </div>
      <div className="flex flex-col gap-y-0.5 rounded-lg border border-border bg-card p-2.5">
        <dt className="font-heading text-muted-foreground">
          Última sincronização
        </dt>
        <dd className="font-semibold">
          {formatDateTime(summary.lastSyncedAt)}
        </dd>
      </div>
      <div className="col-span-2 flex flex-col gap-y-0.5 rounded-lg border border-border bg-card p-2.5">
        <dt className="font-heading text-muted-foreground">Conectado em</dt>
        <dd className="font-semibold">{formatDateTime(summary.connectedAt)}</dd>
      </div>
    </dl>
  );
}

type MembersMainContentProps = {
  state: MembersContentState;
  groupId: string;
  members: GroupMemberRowData[];
  onMemberUpdated: () => void;
  onSendMemberNotice: (target: {
    telegramUserId: string;
    displayName: string;
  }) => void;
};

function MembersMainContent({
  state,
  groupId,
  members,
  onMemberUpdated,
  onSendMemberNotice,
}: MembersMainContentProps) {
  switch (state.kind) {
    case "loading":
      return (
        <div className="flex items-center justify-center gap-2 pt-10 text-sm text-muted-foreground">
          <LoaderIcon size={18} />
          Carregando lista…
        </div>
      );
    case "error":
      return (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-xs">
          {state.message}
        </p>
      );
    case "empty":
      return (
        <p className="text-muted-foreground text-xs">
          Nenhum membro rastreado ainda. Entradas no grupo passam a aparecer
          aqui quando o bot receber os eventos do Telegram.
        </p>
      );
    case "list":
      return (
        <GroupMembersList
          groupId={groupId}
          members={members}
          formatDateTime={formatDateTime}
          onMemberUpdated={onMemberUpdated}
          onSendMemberNotice={onSendMemberNotice}
        />
      );
  }
}

type GroupMembersDrawerProps = {
  group: TelegramGroupSummaryDto;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRequestRemove?: () => void;
  onQuickNoticeRequest?: (payload: QuickNoticePayload) => void;
  onGroupSynced?: () => void;
  /** When a dialog is open on top of this drawer. */
  nestedDialogOpen?: boolean;
  showTrigger?: boolean;
};

export function GroupMembersDrawer({
  group,
  open: openProp,
  onOpenChange,
  onRequestRemove,
  onQuickNoticeRequest,
  onGroupSynced,
  nestedDialogOpen = false,
  showTrigger = true,
}: GroupMembersDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const [displayGroup, setDisplayGroup] =
    useState<TelegramGroupSummaryDto>(group);
  const [data, setData] = useState<TelegramGroupMembersListResponseDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const xIconRef = useRef<XIconHandle>(null);
  const refreshIconRef = useRef<RefreshCWIconHandle>(null);
  const removeIconRef = useRef<XIconHandle>(null);
  const settingsIconRef = useRef<SettingsIconHandle>(null);
  const groupNoticeIconRef = useRef<MessageCircleIconHandle>(null);

  const groupTitle = displayGroup.title ?? "";

  useEffect(() => {
    setDisplayGroup(group);
  }, [group]);

  const loadMembers = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true);
      }
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
          throw new Error(
            body?.error ?? "Não foi possível carregar os membros.",
          );
        }

        const raw: unknown = await res.json();
        const parsed = telegramGroupMembersListResponseSchema.safeParse(raw);
        if (!parsed.success) {
          throw new Error("Resposta inválida do servidor.");
        }

        setData(parsed.data);
        setDisplayGroup((prev) => ({
          ...prev,
          title: parsed.data.title ?? prev.title,
          type: parsed.data.type,
          isForum:
            typeof parsed.data.isForum === "boolean"
              ? parsed.data.isForum
              : prev.isForum,
          memberCount: parsed.data.memberCount,
          trackedMemberCount: parsed.data.trackedMemberCount,
          trackedMemberLimitPerGroup: parsed.data.trackedMemberLimitPerGroup,
          trackedMemberLimitReached: parsed.data.trackedMemberLimitReached,
          leftMemberCount: parsed.data.leftMemberCount,
          updatedAt: parsed.data.lastSyncedAt,
        }));
      } catch (err) {
        setData(null);
        setError(
          err instanceof Error ? err.message : "Erro ao carregar membros.",
        );
      } finally {
        if (!options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [group.id],
  );

  const applyRefreshResult = useCallback(
    (result: RefreshTelegramGroupResult) => {
      const synced = result.synced;
      if (!synced) {
        return;
      }

      setDisplayGroup((prev) => ({
        ...prev,
        title: synced.title ?? prev.title,
        type: synced.chatType ?? prev.type,
        isForum:
          typeof synced.isForum === "boolean" ? synced.isForum : prev.isForum,
        memberCount: synced.memberCount ?? prev.memberCount,
        updatedAt: new Date().toISOString(),
      }));
    },
    [],
  );

  const { refresh, isPending: isSyncing } = useRefreshTelegramGroup(
    group.id,
    groupTitle,
    {
      onSuccess: (result) => {
        applyRefreshResult(result);
        void loadMembers({ silent: true });
        onGroupSynced?.();
      },
    },
  );

  function handleOpenChange(next: boolean) {
    if (!next && nestedDialogOpen) {
      return;
    }

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
    memberCount: data?.memberCount ?? displayGroup.memberCount,
    trackedMemberCount:
      data?.trackedMemberCount ?? displayGroup.trackedMemberCount,
    trackedMemberLimitPerGroup:
      data?.trackedMemberLimitPerGroup ??
      displayGroup.trackedMemberLimitPerGroup,
    trackedMemberLimitReached:
      data?.trackedMemberLimitReached ?? displayGroup.trackedMemberLimitReached,
    leftMemberCount: data?.leftMemberCount ?? displayGroup.leftMemberCount ?? 0,
    connectedAt: data?.connectedAt ?? displayGroup.connectedAt,
    lastSyncedAt: data?.lastSyncedAt ?? displayGroup.updatedAt,
  };

  const members = data?.members ?? displayGroup.members;
  const chatType = data?.type ?? displayGroup.type;
  const isForum =
    typeof data?.isForum === "boolean" ? data.isForum : displayGroup.isForum;
  const botDisplay = getBotStatusDisplay(displayGroup.botStatus);

  function handleSendGroupNotice() {
    if (isSyncing || isLoading) {
      return;
    }

    onQuickNoticeRequest?.({
      type: "group",
      title: groupTitle,
      groupId: displayGroup.id,
    });
  }
  const membersContentState = resolveMembersContentState(
    isLoading,
    error,
    members.length,
  );
  const showSummary = membersContentState.kind !== "loading";

  return (
    <Drawer
      direction="right"
      open={open}
      dismissible={!nestedDialogOpen}
      onOpenChange={handleOpenChange}
    >
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
      <DrawerContent
        overlayClassName={nestedDialogOpen ? "opacity-0" : undefined}
        overlayStyle={nestedDialogOpen ? { pointerEvents: "none" } : undefined}
        className="data-[vaul-drawer-direction=right]:h-full data-[vaul-drawer-direction=right]:max-h-none data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DrawerHeader className="relative shrink-0 p-0 border-b border-border text-left">
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
              <div className="flex items-start pl-6 pt-4 pr-16 gap-3">
                <ImageComponent
                  src={
                    displayGroup.chatPhotoUrl
                      ? withCacheBuster(
                          displayGroup.chatPhotoUrl,
                          displayGroup.updatedAt,
                        )
                      : null
                  }
                  alt={displayGroup.title?.trim() || "Grupo sem nome"}
                  avatarFallbackClassName="text-lg"
                  width={50}
                  height={50}
                  className="size-[50px] border border-border shrink-0 rounded-full object-cover"
                />

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <DrawerTitle className="max-w-full line-clamp-2 break-all">
                    {displayGroup.title || "Grupo sem nome"}
                  </DrawerTitle>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 font-medium",
                        botDisplay.className,
                      )}
                    >
                      {botDisplay.label}
                    </Badge>
                    <TelegramGroupTypeBadges
                      type={chatType}
                      isForum={isForum}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/groups/${displayGroup.id}/bot`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "flex h-auto flex-col items-center justify-center gap-1 py-3 text-sm",
                    )}
                    onMouseEnter={() =>
                      settingsIconRef.current?.startAnimation()
                    }
                    onMouseLeave={() =>
                      settingsIconRef.current?.stopAnimation()
                    }
                  >
                    <SettingsIcon
                      ref={settingsIconRef}
                      size={18}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="text-center leading-tight">
                      Configurar bot
                    </span>
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex h-auto flex-col items-center justify-center gap-1 py-3 text-sm"
                    disabled={isSyncing || isLoading}
                    onClick={() => refresh()}
                    onMouseEnter={() =>
                      refreshIconRef.current?.startAnimation()
                    }
                    onMouseLeave={() => refreshIconRef.current?.stopAnimation()}
                  >
                    <RefreshCWIcon
                      ref={refreshIconRef}
                      size={18}
                      isAnimateOnView={false}
                      className={cn(
                        "shrink-0 text-muted-foreground",
                        isSyncing && "animate-spin",
                      )}
                    />
                    <span className="text-center leading-tight">
                      {isSyncing ? "Sincronizando…" : "Sincronizar dados"}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex h-auto flex-col items-center justify-center gap-1 py-3 text-sm"
                    disabled={isSyncing || isLoading}
                    onClick={handleSendGroupNotice}
                    onMouseEnter={() =>
                      groupNoticeIconRef.current?.startAnimation()
                    }
                    onMouseLeave={() =>
                      groupNoticeIconRef.current?.stopAnimation()
                    }
                  >
                    <MessageCircleIcon
                      ref={groupNoticeIconRef}
                      size={18}
                      isAnimateOnView={false}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="text-center leading-tight">
                      Enviar aviso no grupo
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex h-auto flex-col items-center justify-center gap-1 py-3 text-sm"
                    disabled={isSyncing || isLoading}
                    onClick={() => onRequestRemove?.()}
                    onMouseEnter={() => removeIconRef.current?.startAnimation()}
                    onMouseLeave={() => removeIconRef.current?.stopAnimation()}
                  >
                    <XIcon
                      ref={removeIconRef}
                      size={18}
                      isAnimateOnView={false}
                      className="shrink-0"
                    />
                    <span className="text-center leading-tight">
                      Desconectar bot
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </DrawerHeader>

          <div
            ref={scrollAreaRef}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          >
            <MembersInfoCallout />

            <div className="flex flex-col gap-6 p-6 pt-0">
              {showSummary ? <MembersSummaryGrid summary={summary} /> : null}

              <MembersMainContent
                state={membersContentState}
                groupId={displayGroup.id}
                members={members}
                onMemberUpdated={() => void loadMembers({ silent: true })}
                onSendMemberNotice={(target) =>
                  onQuickNoticeRequest?.({
                    type: "members",
                    title: target.displayName,
                    targets: [
                      {
                        telegramUserId: target.telegramUserId,
                        displayName: target.displayName,
                      },
                    ],
                  })
                }
              />
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

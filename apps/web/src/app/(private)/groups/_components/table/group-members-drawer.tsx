"use client";

import { InfoIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TelegramGroupTypeBadges } from "@/app/(private)/groups/_components/table/telegram-group-type-badges";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { getBotStatusDisplay } from "@/lib/telegram-bot-status";
import { cn, withCacheBuster } from "@/lib/utils";
import {
  type TelegramGroupMembersListResponseDto,
  type TelegramGroupSummaryDto,
  telegramGroupMembersListResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import {
  useRefreshTelegramGroup,
  type RefreshTelegramGroupResult,
} from "../../_hooks/use-refresh-telegram-group";
import { GroupMemberRow } from "./group-member-row";
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
  const [displayGroup, setDisplayGroup] =
    useState<TelegramGroupSummaryDto>(group);
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

  const groupTitle = displayGroup.title ?? "";

  useEffect(() => {
    setDisplayGroup(group);
  }, [group]);

  const loadMembers = useCallback(async (options?: { silent?: boolean }) => {
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
        throw new Error(body?.error ?? "Não foi possível carregar os membros.");
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
  }, [group.id]);

  const applyRefreshResult = useCallback((result: RefreshTelegramGroupResult) => {
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
  }, []);

  const { refresh, isPending: isSyncing } = useRefreshTelegramGroup(
    group.id,
    groupTitle,
    {
      onSuccess: (result) => {
        applyRefreshResult(result);
        void loadMembers({ silent: true });
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
    memberCount: data?.memberCount ?? displayGroup.memberCount,
    trackedMemberCount:
      data?.trackedMemberCount ?? displayGroup.trackedMemberCount,
    trackedMemberLimitPerGroup:
      data?.trackedMemberLimitPerGroup ??
      displayGroup.trackedMemberLimitPerGroup,
    trackedMemberLimitReached:
      data?.trackedMemberLimitReached ??
      displayGroup.trackedMemberLimitReached,
    leftMemberCount: data?.leftMemberCount,
    connectedAt: data?.connectedAt ?? displayGroup.connectedAt,
    lastSyncedAt: data?.lastSyncedAt ?? displayGroup.updatedAt,
  };

  const members = data?.members ?? displayGroup.members;
  const chatType = data?.type ?? displayGroup.type;
  const isForum =
    typeof data?.isForum === "boolean" ? data.isForum : displayGroup.isForum;
  const botDisplay = getBotStatusDisplay(displayGroup.botStatus);

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
                  src={withCacheBuster(
                    displayGroup.chatPhotoUrl ?? "",
                    displayGroup.updatedAt ?? "",
                  )}
                  alt={displayGroup.title || "Grupo sem nome"}
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
                        "shrink-0 text-[10px] font-medium",
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
              <div className="flex flex-col px-6 py-4 border-t border-border gap-2 sm:flex-row">
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
                  — todos os membros do chat segundo o Telegram (bots inclusos).
                  O Gateon só exibe esse número e não gerencia.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Gerenciados
                  </span>{" "}
                  — perfis que o bot registrou e que ainda estão no grupo. São
                  os da lista{" "}
                  <span className="font-medium text-foreground">
                    Membros rastreados
                  </span>
                  , contam no limite do plano e, ao sair, deixam de aparecer e
                  passam para{" "}
                  <span className="font-medium text-foreground">
                    Saíram do grupo
                  </span>
                  .
                </p>
              </div>
            </div>

            {!isLoading ? (
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
            ) : null}

            <div className="flex flex-col gap-2">
              {isLoading && !data ? (
                <div className="flex items-center justify-center gap-2 pt-10 text-sm text-muted-foreground">
                  <LoaderIcon size={18} />
                  Carregando lista…
                </div>
              ) : null}

              {isLoading && data ? (
                <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  <LoaderIcon size={14} />
                  Atualizando…
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
                <>
                  <h3 className="text-sm font-semibold text-foreground">
                    Membros rastreados ({members.length})
                  </h3>

                  <TooltipProvider>
                    <ul className="space-y-2 pb-2">
                      {members.map((member) => (
                        <GroupMemberRow
                          key={member.telegramUserId}
                          member={member}
                          displayName={formatMemberName(member)}
                          updatedAt={getMemberUpdatedAt(member)}
                          formatDateTime={formatDateTime}
                        />
                      ))}
                    </ul>
                  </TooltipProvider>
                </>
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

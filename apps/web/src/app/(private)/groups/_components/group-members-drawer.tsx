"use client";

import { InfoIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { LoaderIcon } from "@/components/icons/loader";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import {
  type TelegramGroupMembersListResponseDto,
  type TelegramGroupSummaryDto,
  telegramGroupMembersListResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";

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
};

export function GroupMembersDrawer({ group }: GroupMembersDrawerProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TelegramGroupMembersListResponseDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
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

        if (!cancelled) {
          setData(parsed.data);
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(
            err instanceof Error ? err.message : "Erro ao carregar membros.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, group.id]);

  const summary = {
    memberCount: data?.memberCount ?? group.memberCount,
    trackedMemberCount: data?.trackedMemberCount ?? group.trackedMemberCount,
    trackedMemberLimitPerGroup:
      data?.trackedMemberLimitPerGroup ?? group.trackedMemberLimitPerGroup,
    trackedMemberLimitReached:
      data?.trackedMemberLimitReached ?? group.trackedMemberLimitReached,
  };

  const members = data?.members ?? group.members;

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="link"
          className="h-auto justify-start p-0 text-[10px] text-primary underline-offset-2"
        >
          Ver contagem e membros
        </Button>
      </DrawerTrigger>
      <DrawerContent className="data-[vaul-drawer-direction=right]:h-full data-[vaul-drawer-direction=right]:max-h-none data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DrawerHeader className="shrink-0 border-b border-border text-left">
            <DrawerTitle className="pr-8">
              {group.title || "Grupo sem nome"}
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              ID do chat:{" "}
              <span className="font-mono text-foreground">
                {group.telegramChatId}
              </span>
            </DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-start gap-2">
                <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">
                      Total no Telegram
                    </span>{" "}
                    é o número que o app do Telegram reporta para o grupo (pode
                    incluir pessoas que o Gateon ainda não rastreia).
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Gerenciados no Gateon
                    </span>{" "}
                    são perfis ativos na base do bot (
                    <span className="font-medium">sem saída registrada</span>
                    ). O limite do plano vale{" "}
                    <span className="font-medium">por grupo</span>. Novos perfis
                    entram quando o bot recebe eventos de entrada no grupo.
                  </p>
                  {summary.trackedMemberLimitReached ? (
                    <p className="text-amber-600 dark:text-amber-500">
                      Capacidade esgotada neste grupo. O Telegram pode ter mais
                      pessoas, mas o Gateon não gerencia novos perfis até
                      liberar vagas ou mudar de plano.
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border bg-card p-2.5">
                <dt className="text-muted-foreground">Total no Telegram</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                  {summary.memberCount ?? "—"}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-card p-2.5">
                <dt className="text-muted-foreground">Gerenciados</dt>
                <dd
                  className={cn(
                    "mt-0.5 font-semibold tabular-nums",
                    summary.trackedMemberLimitReached
                      ? "text-amber-600 dark:text-amber-500"
                      : "text-foreground",
                  )}
                >
                  {summary.trackedMemberCount} /{" "}
                  {summary.trackedMemberLimitPerGroup}
                </dd>
              </div>
            </dl>

            <h3 className="mt-6 mb-2 text-sm font-semibold text-foreground">
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

          <DrawerFooter className="shrink-0 border-t border-border">
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="w-full">
                Fechar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

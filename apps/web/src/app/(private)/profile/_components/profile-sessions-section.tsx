"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/data-table-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientPagination } from "@/hooks/use-client-pagination";
import type { UserProfileDto } from "@/lib/zod/auth-schemas";
import { ProfileSessionRow } from "./profile-session-row";

const SESSIONS_PAGE_SIZE = 5;

type ProfileSessionsSectionProps = {
  sessions: UserProfileDto["sessions"];
};

export function ProfileSessionsSection({
  sessions,
}: ProfileSessionsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((left, right) => {
        if (left.isCurrent !== right.isCurrent) {
          return left.isCurrent ? -1 : 1;
        }

        return (
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime()
        );
      }),
    [sessions],
  );

  const pagination = useClientPagination(sortedSessions, {
    pageSize: SESSIONS_PAGE_SIZE,
    resetKey: String(sortedSessions.length),
  });

  const otherSessionsCount = sessions.filter(
    (session) => !session.isCurrent,
  ).length;

  async function revokeSession(sessionId: string) {
    setRevokingId(sessionId);
    try {
      const response = await fetch(
        `/api/auth/sessions/${encodeURIComponent(sessionId)}`,
        { method: "DELETE" },
      );

      const raw: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          raw &&
          typeof raw === "object" &&
          "error" in raw &&
          typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : "Não foi possível encerrar a sessão.";
        throw new Error(message);
      }

      toast.success("Sessão encerrada");
      router.refresh();
    } catch (error) {
      toast.error("Falha ao encerrar sessão", {
        description:
          error instanceof Error
            ? error.message
            : "Tente novamente em instantes.",
      });
    } finally {
      setRevokingId(null);
    }
  }

  function revokeOtherSessions() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/sessions", {
          method: "DELETE",
        });

        const raw: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            raw &&
            typeof raw === "object" &&
            "error" in raw &&
            typeof (raw as { error?: unknown }).error === "string"
              ? (raw as { error: string }).error
              : "Não foi possível encerrar as outras sessões.";
          throw new Error(message);
        }

        const revokedCount =
          raw &&
          typeof raw === "object" &&
          "revokedCount" in raw &&
          typeof (raw as { revokedCount?: unknown }).revokedCount === "number"
            ? (raw as { revokedCount: number }).revokedCount
            : 0;

        toast.success(
          revokedCount > 0
            ? `${revokedCount} sessão(ões) encerrada(s)`
            : "Nenhuma outra sessão ativa",
        );
        router.refresh();
      } catch (error) {
        toast.error("Falha ao encerrar sessões", {
          description:
            error instanceof Error
              ? error.message
              : "Tente novamente em instantes.",
        });
      }
    });
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="space-y-1">
          <CardTitle>Sessões ativas</CardTitle>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Monitore e gerencie os dispositivos conectados à sua conta. Se
            encontrar uma sessão desconhecida, revogue o acesso e altere sua
            senha. IP e navegador são armazenados apenas como hash por
            privacidade.
          </p>
        </div>
        {otherSessionsCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={revokeOtherSessions}
            loading={isPending}
            disabled={isPending}
            className="shrink-0"
          >
            Encerrar outras sessões
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="p-0">
        {sessions.length === 0 ? (
          <div className="flex min-h-52 items-center justify-center px-5 text-muted-foreground text-sm">
            Nenhuma sessão registrada.
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {pagination.paginatedItems.map((session) => (
                <ProfileSessionRow
                  key={session.id}
                  session={session}
                  onRevoke={revokeSession}
                  isRevoking={revokingId === session.id}
                  revokeDisabled={revokingId !== null || isPending}
                />
              ))}
            </div>

            <div className="border-t border-border px-4 py-3 sm:px-5">
              <DataTablePagination
                pagination={pagination}
                itemLabel="sessão"
                itemLabelPlural="sessões"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  type RefreshAllTelegramGroupsResultDto,
  refreshAllTelegramGroupsResultSchema,
} from "@/lib/zod/telegram-group-connection-schemas";

function readRefreshAllError(body: unknown): string {
  if (body && typeof body === "object") {
    if (
      "error" in body &&
      typeof (body as { error?: unknown }).error === "string"
    ) {
      return (body as { error: string }).error;
    }
    if (
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
    ) {
      return (body as { message: string }).message;
    }
  }

  return "Não foi possível sincronizar os grupos.";
}

function getRefreshAllSuccessMessage(result: RefreshAllTelegramGroupsResultDto) {
  if (result.totalCount === 0) {
    return "Nenhum grupo conectado para sincronizar.";
  }

  if (result.failedCount === 0) {
    return `${result.refreshedCount} grupo(s) sincronizado(s) com o Telegram.`;
  }

  if (result.refreshedCount === 0) {
    return "Nenhum grupo foi sincronizado.";
  }

  return `${result.refreshedCount} de ${result.totalCount} grupo(s) sincronizado(s).`;
}

export function useRefreshAllTelegramGroups(options?: {
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function refreshAll() {
    startTransition(async () => {
      const toastId = toast.loading("Sincronizando grupos...", {
        description: "Atualizando dados de todos os grupos com o Telegram.",
      });

      try {
        const response = await fetch("/api/telegram/groups/refresh-all", {
          method: "POST",
          credentials: "include",
        });

        const body: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          toast.error("Falha ao recarregar grupos", {
            id: toastId,
            description: readRefreshAllError(body),
          });
          return;
        }

        const parsed = refreshAllTelegramGroupsResultSchema.safeParse(body);
        if (!parsed.success) {
          toast.error("Falha ao recarregar grupos", {
            id: toastId,
            description: "A resposta da API veio em formato inválido.",
          });
          return;
        }

        const result = parsed.data;

        if (result.refreshedCount === 0 && result.totalCount > 0) {
          toast.error("Falha ao recarregar grupos", {
            id: toastId,
            description: getRefreshAllSuccessMessage(result),
          });
          return;
        }

        if (result.failedCount > 0) {
          toast.warning("Sincronização parcial", {
            id: toastId,
            description: getRefreshAllSuccessMessage(result),
          });
        } else {
          toast.success("Grupos atualizados", {
            id: toastId,
            description: getRefreshAllSuccessMessage(result),
          });
        }

        router.refresh();
        options?.onSuccess?.();
      } catch {
        toast.error("Falha ao recarregar grupos", {
          id: toastId,
          description: "Verifique sua conexão e tente novamente.",
        });
      }
    });
  }

  return { refreshAll, isPending };
}

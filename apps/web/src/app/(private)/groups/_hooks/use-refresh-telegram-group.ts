"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export function useRefreshTelegramGroup(
  groupId: string,
  groupTitle?: string,
  options?: { onSuccess?: () => void },
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/telegram/groups/${encodeURIComponent(groupId)}/refresh`,
          {
            method: "POST",
            credentials: "include",
          },
        );

        if (!res.ok) {
          const body: unknown = await res.json().catch(() => null);
          const message =
            body &&
            typeof body === "object" &&
            "error" in body &&
            typeof (body as { error?: unknown }).error === "string"
              ? (body as { error: string }).error
              : "Não foi possível atualizar os dados do grupo.";

          toast.error("Falha ao atualizar grupo", { description: message });
          return;
        }

        toast.success("Grupo atualizado", {
          description: groupTitle
            ? `"${groupTitle}" foi sincronizado com o Telegram.`
            : "Título e foto do grupo foram sincronizados com o Telegram.",
        });
        router.refresh();
        options?.onSuccess?.();
      } catch {
        toast.error("Falha ao atualizar grupo", {
          description: "Não foi possível sincronizar agora. Tente novamente.",
        });
      }
    });
  }

  return { refresh, isPending };
}

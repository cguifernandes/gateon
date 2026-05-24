"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  type RefreshTelegramGroupResultDto,
  refreshTelegramGroupResultSchema,
} from "@/lib/zod/telegram-group-connection-schemas";

export type RefreshTelegramGroupResult = RefreshTelegramGroupResultDto;

export function useRefreshTelegramGroup(
  groupId: string,
  groupTitle?: string,
  options?: { onSuccess?: (result: RefreshTelegramGroupResult) => void },
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

        const body: unknown = await res.json().catch(() => null);

        if (!res.ok) {
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

        const parsed = refreshTelegramGroupResultSchema.safeParse(body ?? {});
        const result = parsed.success ? parsed.data : { refreshed: true };

        toast.success("Grupo atualizado", {
          description: groupTitle
            ? `"${groupTitle}" foi sincronizado com o Telegram.`
            : "Dados do grupo foram sincronizados com o Telegram.",
        });

        router.refresh();
        options?.onSuccess?.(result);
      } catch {
        toast.error("Falha ao atualizar grupo", {
          description: "Não foi possível sincronizar agora. Tente novamente.",
        });
      }
    });
  }

  return { refresh, isPending };
}

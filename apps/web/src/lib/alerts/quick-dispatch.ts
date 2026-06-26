"use client";

import { toast } from "sonner";
import {
  type AlertQuickDispatchInput,
  alertQuickDispatchRunResultSchema,
} from "@/lib/zod/alert-schemas";

function readDispatchError(body: unknown): string {
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

  return "Não foi possível enviar o aviso rápido.";
}

function assertDispatchSucceeded(body: unknown) {
  const parsed = alertQuickDispatchRunResultSchema.safeParse(body);
  if (!parsed.success) {
    return;
  }

  const { successCount, failCount } = parsed.data;
  if (successCount === 0 && failCount > 0) {
    throw new Error(
      "Não foi possível enviar o aviso. Verifique se o bot pode enviar mensagens aos destinatários.",
    );
  }

  if (successCount === 0 && failCount === 0) {
    throw new Error("Nenhum destinatário recebeu o aviso.");
  }
}

export async function dispatchQuickAlert(
  alertId: string,
  payload: AlertQuickDispatchInput,
) {
  const response = await fetch(
    `/api/alerts/${encodeURIComponent(alertId)}/dispatch`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readDispatchError(body));
  }

  assertDispatchSucceeded(body);
  return body;
}

export async function dispatchQuickAlertWithToast(
  alertId: string,
  payload: AlertQuickDispatchInput,
  options?: { successMessage?: string },
) {
  const toastId = toast.loading("Enviando aviso rápido...", {
    description: "Disparando o modelo selecionado.",
  });

  try {
    const body = await dispatchQuickAlert(alertId, payload);
    const parsed = alertQuickDispatchRunResultSchema.safeParse(body);
    const successCount = parsed.success ? parsed.data.successCount : 1;

    toast.success(
      options?.successMessage ??
        (successCount === 1
          ? "Aviso enviado com sucesso."
          : `Aviso enviado para ${successCount} destinatários.`),
      { id: toastId },
    );

    return { success: true as const };
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Falha ao enviar aviso rápido.",
      { id: toastId },
    );
    return { success: false as const };
  }
}

"use client";

import { toast } from "sonner";
import { fetchJsonWithSentry } from "@/lib/sentry/report-client-api-error";

export type AlertAction = "run" | "duplicate" | "pause" | "activate" | "delete";

export const ALERT_ACTION_UI_LABELS: Record<AlertAction, string> = {
  run: "Executar agora",
  duplicate: "Duplicar",
  pause: "Pausar",
  activate: "Ativar",
  delete: "Excluir",
};

const ALERT_ACTION_RESULT_LABELS: Record<AlertAction, string> = {
  run: "Execução",
  duplicate: "Duplicação",
  pause: "Pausa",
  activate: "Ativação",
  delete: "Exclusão",
};

type AlertRunActionResult = {
  successCount?: number;
  failCount?: number;
  status?: string;
};

export function getAlertActionLoadingToast(action: AlertAction) {
  switch (action) {
    case "run":
      return {
        title: "Executando alerta...",
        description: "Enviando mensagens conforme a configuração do alerta.",
      };
    case "duplicate":
      return {
        title: "Duplicando alerta...",
        description: "Criando uma cópia do alerta.",
      };
    case "pause":
      return {
        title: "Pausando alerta...",
        description: "O alerta deixará de disparar automaticamente.",
      };
    case "activate":
      return {
        title: "Ativando alerta...",
        description: "Publicando o alerta para disparo.",
      };
    case "delete":
      return {
        title: "Excluindo alerta...",
        description: "Removendo o alerta permanentemente.",
      };
  }
}

function getAlertActionSuccessMessage(
  action: AlertAction,
  body: unknown,
): string {
  if (action === "run") {
    const result =
      body && typeof body === "object" ? (body as AlertRunActionResult) : null;
    const failCount = result?.failCount ?? 0;

    if (failCount > 0) {
      return "Alerta enviado com falhas em parte dos destinatários.";
    }

    return "Alerta executado com sucesso.";
  }

  switch (action) {
    case "duplicate":
      return "Alerta duplicado com sucesso.";
    case "pause":
      return "Alerta pausado com sucesso.";
    case "activate":
      return "Alerta ativado com sucesso.";
    case "delete":
      return "Alerta excluído com sucesso.";
    default:
      return "Ação executada com sucesso.";
  }
}

function readAlertActionError(body: unknown): string {
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
    if (Array.isArray((body as { message?: unknown }).message)) {
      const first = (body as { message: unknown[] }).message[0];
      if (typeof first === "string") {
        return first;
      }
    }
  }
  return "Não foi possível executar a ação.";
}

function assertAlertRunSucceeded(body: unknown) {
  if (!body || typeof body !== "object") {
    return;
  }

  const result = body as AlertRunActionResult;
  const successCount = result.successCount ?? 0;
  const failCount = result.failCount ?? 0;

  if (successCount === 0 && failCount > 0) {
    throw new Error(
      "Não foi possível enviar o alerta. Verifique se o bot é administrador do grupo com permissão para enviar mensagens.",
    );
  }

  if (successCount === 0 && failCount === 0) {
    throw new Error(
      "Este alerta não tem destinatários configurados para envio.",
    );
  }
}

export async function runAlertAction(
  alertId: string,
  action: AlertAction,
): Promise<unknown> {
  const route =
    action === "delete"
      ? `/api/alerts/${alertId}`
      : `/api/alerts/${alertId}/${action}`;
  const response = await fetchJsonWithSentry(
    route,
    { method: action === "delete" ? "DELETE" : "POST" },
    route,
  );

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readAlertActionError(body));
  }

  if (action === "run") {
    assertAlertRunSucceeded(body);
  }

  return body;
}

export async function runAlertActionWithToasts(
  alertId: string,
  action: AlertAction,
): Promise<{ success: boolean }> {
  const actionLabel = ALERT_ACTION_RESULT_LABELS[action];
  const loadingToast = getAlertActionLoadingToast(action);
  const toastId = toast.loading(loadingToast.title, {
    description: loadingToast.description,
  });

  try {
    const body = await runAlertAction(alertId, action);
    toast.success(getAlertActionSuccessMessage(action, body), {
      id: toastId,
      description: `${actionLabel} concluída.`,
    });
    return { success: true };
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "Não foi possível executar a ação.",
      { id: toastId },
    );
    return { success: false };
  }
}

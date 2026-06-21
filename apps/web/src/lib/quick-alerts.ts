import {
  alertsResponseSchema,
  type AlertSummaryDto,
} from "@/lib/zod/alert-schemas";

export type QuickAlertOption = Pick<
  AlertSummaryDto,
  "id" | "name" | "content" | "status" | "options"
>;

export function selectQuickAlertOptions(
  alerts: AlertSummaryDto[],
): QuickAlertOption[] {
  return alerts.filter(
    (alert) =>
      alert.destinationType === "QUICK_ALERT" && alert.status !== "DRAFT",
  );
}

function readQuickAlertsError(body: unknown): string {
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

  return "Não foi possível carregar os avisos rápidos.";
}

export async function fetchQuickAlertOptions(signal?: AbortSignal): Promise<{
  alerts: QuickAlertOption[];
  error: string | null;
}> {
  try {
    const response = await fetch("/api/alerts?destinationType=QUICK_ALERT", {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      signal,
    });
    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      return { alerts: [], error: readQuickAlertsError(body) };
    }

    const parsed = alertsResponseSchema.safeParse(body);
    if (!parsed.success) {
      return {
        alerts: [],
        error: "A resposta da API veio em formato inválido.",
      };
    }

    return {
      alerts: selectQuickAlertOptions(parsed.data.alerts),
      error: null,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { alerts: [], error: null };
    }

    return {
      alerts: [],
      error: "Não foi possível carregar os avisos rápidos.",
    };
  }
}

export function getQuickAlertCardDescription(
  alert: QuickAlertOption,
  maxLength = 140,
): string {
  const body = alert.content.body.trim();
  if (body.length <= maxLength) return body;
  return `${body.slice(0, maxLength - 3).trimEnd()}...`;
}

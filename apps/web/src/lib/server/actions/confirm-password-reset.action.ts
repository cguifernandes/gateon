"use server";

import { getServerApiBaseUrl } from "@/lib/http/api-base-url";
import { reportServerActionError } from "@/lib/sentry/report-server-action-error";
import { passwordResetConfirmSchema } from "@/lib/zod/auth-schemas";
import {
  getUpstreamFetchTimeoutMs,
  upstreamFetchFailedMessage,
} from "../fetch/upstream-fetch";

const ACTION = "confirmPasswordResetAction";
const UPSTREAM_PATH = "/auth/password-reset/confirm";

export type ConfirmPasswordResetResult =
  | { ok: true }
  | {
      ok: false;
      code: "validation" | "unknown";
      message: string;
    };

export async function confirmPasswordResetAction(
  raw: unknown,
): Promise<ConfirmPasswordResetResult> {
  const parsedForm = passwordResetConfirmSchema.safeParse(raw);
  if (!parsedForm.success) {
    const first = parsedForm.error.issues[0];
    return {
      ok: false,
      code: "validation",
      message: first?.message ?? "Dados inválidos.",
    };
  }

  const base = getServerApiBaseUrl();
  if (!base) {
    reportServerActionError({
      action: ACTION,
      upstreamPath: UPSTREAM_PATH,
      message: "Upstream API not configured",
    });
    return {
      ok: false,
      code: "unknown",
      message: "Configuração incompleta no servidor.",
    };
  }

  let res: Response;
  try {
    res = await fetch(`${base}${UPSTREAM_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedForm.data),
      signal: AbortSignal.timeout(getUpstreamFetchTimeoutMs()),
      cache: "no-store",
    });
  } catch (error) {
    reportServerActionError({
      action: ACTION,
      upstreamPath: UPSTREAM_PATH,
      message: "Upstream request failed",
      error,
    });
    return {
      ok: false,
      code: "unknown",
      message: upstreamFetchFailedMessage(error),
    };
  }

  if (res.ok) {
    return { ok: true };
  }

  let errBody: unknown;
  try {
    errBody = await res.json();
  } catch {
    errBody = null;
  }

  const messageFromApi =
    typeof errBody === "object" &&
    errBody !== null &&
    "message" in errBody &&
    typeof (errBody as { message: unknown }).message === "string"
      ? (errBody as { message: string }).message
      : null;

  if (res.status === 400 || res.status === 422) {
    return {
      ok: false,
      code: "validation",
      message: messageFromApi ?? "Link de redefinição inválido ou expirado.",
    };
  }

  reportServerActionError({
    action: ACTION,
    upstreamPath: UPSTREAM_PATH,
    message: messageFromApi ?? "Unexpected upstream status",
    status: res.status,
  });

  return {
    ok: false,
    code: "unknown",
    message: "Não foi possível redefinir a senha. Tente novamente.",
  };
}

"use server";

import { reportServerActionError } from "@/lib/sentry/report-server-action-error";
import {
  PASSWORD_RESET_GENERIC_MESSAGE,
  passwordResetRequestSchema,
} from "@/lib/zod/auth-schemas";
import { getServerApiBaseUrl } from "../utils";
import {
  getUpstreamFetchTimeoutMs,
  upstreamFetchFailedMessage,
} from "./upstream-fetch";

const ACTION = "requestPasswordResetAction";
const UPSTREAM_PATH = "/auth/password-reset/request";

export type RequestPasswordResetResult =
  | { ok: true; message: string }
  | {
      ok: false;
      code: "validation" | "unknown";
      message: string;
    };

export async function requestPasswordResetAction(
  raw: unknown,
): Promise<RequestPasswordResetResult> {
  const parsedForm = passwordResetRequestSchema.safeParse(raw);
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
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE };
    }

    const message =
      typeof json === "object" &&
      json !== null &&
      "message" in json &&
      typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : PASSWORD_RESET_GENERIC_MESSAGE;

    return { ok: true, message };
  }

  if (res.status === 400 || res.status === 422) {
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
        : "Dados inválidos.";

    return {
      ok: false,
      code: "validation",
      message: messageFromApi,
    };
  }

  reportServerActionError({
    action: ACTION,
    upstreamPath: UPSTREAM_PATH,
    message: "Unexpected upstream status",
    status: res.status,
  });

  return {
    ok: false,
    code: "unknown",
    message: "Não foi possível enviar o e-mail. Tente novamente.",
  };
}

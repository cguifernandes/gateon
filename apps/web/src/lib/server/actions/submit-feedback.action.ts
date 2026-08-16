"use server";

import { cookies, headers } from "next/headers";
import { reportServerActionError } from "@/lib/sentry/report-server-action-error";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  createFeedbackSchema,
  feedbackCreatedResponseSchema,
} from "@/lib/zod/feedback-schemas";
import {
  getUpstreamFetchTimeoutMs,
  upstreamFetchFailedMessage,
} from "../fetch/upstream-fetch";

const ACTION = "submitFeedbackAction";
const UPSTREAM_PATH = "/feedback";

export type SubmitFeedbackResult =
  | { ok: true }
  | {
      ok: false;
      code: "validation" | "unauthorized" | "unknown";
      message: string;
    };

export async function submitFeedbackAction(
  raw: unknown,
): Promise<SubmitFeedbackResult> {
  const parsed = createFeedbackSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      code: "validation",
      message: first?.message ?? "Dados inválidos.",
    };
  }

  const base = getServerApiBaseUrl();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!base) {
    await reportServerActionError({
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

  if (!sessionToken) {
    return {
      ok: false,
      code: "unauthorized",
      message: "Sua sessão expirou. Faça login novamente.",
    };
  }

  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for") ?? h.get("x-real-ip");

  let res: Response;
  try {
    res = await fetch(`${base}${UPSTREAM_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(getUpstreamFetchTimeoutMs()),
      cache: "no-store",
    });
  } catch (error) {
    await reportServerActionError({
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
    } catch (error) {
      await reportServerActionError({
        action: ACTION,
        upstreamPath: UPSTREAM_PATH,
        message: "Invalid upstream JSON response",
        error,
      });
      return {
        ok: false,
        code: "unknown",
        message: "Resposta inválida do servidor.",
      };
    }

    const bodyParsed = feedbackCreatedResponseSchema.safeParse(json);
    if (!bodyParsed.success) {
      await reportServerActionError({
        action: ACTION,
        upstreamPath: UPSTREAM_PATH,
        message: "Invalid upstream response shape",
      });
      return {
        ok: false,
        code: "unknown",
        message: "Resposta inválida do servidor.",
      };
    }

    return { ok: true };
  }

  if (res.status === 401) {
    return {
      ok: false,
      code: "unauthorized",
      message: "Sua sessão expirou. Faça login novamente.",
    };
  }

  if (res.status === 400 || res.status === 422) {
    return {
      ok: false,
      code: "validation",
      message: "Dados inválidos.",
    };
  }

  await reportServerActionError({
    action: ACTION,
    upstreamPath: UPSTREAM_PATH,
    message: "Unexpected upstream status",
    status: res.status,
  });

  return {
    ok: false,
    code: "unknown",
    message: "Não foi possível enviar seu feedback. Tente novamente.",
  };
}

"use server";

import { cookies, headers } from "next/headers";
import { getServerApiBaseUrl } from "@/lib/http/api-base-url";
import { reportServerActionError } from "@/lib/sentry/report-server-action-error";
import {
  authSuccessBodySchema,
  createAuthSchema,
  type PublicUserDto,
} from "@/lib/zod/auth-schemas";
import {
  getUpstreamFetchTimeoutMs,
  upstreamFetchFailedMessage,
} from "../fetch/upstream-fetch";
import {
  applySessionSetCookieFromUpstream,
  getSetCookieLines,
} from "./apply-session-set-cookie";

const ACTION = "loginAction";
const UPSTREAM_PATH = "/auth/login";

export type LoginUserResult =
  | { ok: true; user: PublicUserDto }
  | {
      ok: false;
      code: "validation" | "unauthorized" | "unknown";
      message: string;
    };

export async function loginAction(raw: unknown): Promise<LoginUserResult> {
  const parsedForm = createAuthSchema("login").safeParse(raw);
  if (!parsedForm.success) {
    const first = parsedForm.error.issues[0];
    return {
      ok: false,
      code: "validation",
      message: first?.message ?? "Dados inválidos.",
    };
  }

  const { email, password } = parsedForm.data;

  const base = getServerApiBaseUrl();
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

  const h = await headers();
  const xfwd = h.get("x-forwarded-for");
  const realIp = h.get("x-real-ip");

  let res: Response;
  try {
    res = await fetch(`${base}${UPSTREAM_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(xfwd ? { "x-forwarded-for": xfwd } : {}),
        ...(!xfwd && realIp ? { "x-forwarded-for": realIp } : {}),
      },
      body: JSON.stringify({ email, password }),
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

  const setCookies = getSetCookieLines(res);

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

    const bodyParsed = authSuccessBodySchema.safeParse(json);
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

    const cookieStore = await cookies();
    for (const line of setCookies) {
      applySessionSetCookieFromUpstream(cookieStore, line);
    }

    return { ok: true, user: bodyParsed.data.user };
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

  if (res.status === 401) {
    return {
      ok: false,
      code: "unauthorized",
      message: "E-mail ou senha incorretos.",
    };
  }

  if (res.status === 400 || res.status === 422) {
    return {
      ok: false,
      code: "validation",
      message: messageFromApi ?? "Dados inválidos.",
    };
  }

  await reportServerActionError({
    action: ACTION,
    upstreamPath: UPSTREAM_PATH,
    message: messageFromApi ?? "Unexpected upstream status",
    status: res.status,
  });

  return {
    ok: false,
    code: "unknown",
    message: "Não foi possível entrar. Tente novamente.",
  };
}

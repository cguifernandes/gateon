"use server";

import { cookies, headers } from "next/headers";
import { reportServerActionError } from "@/lib/sentry/report-server-action-error";
import {
  authSuccessBodySchema,
  createAuthSchema,
  type PublicUserDto,
} from "@/lib/zod/auth-schemas";
import { getServerApiBaseUrl } from "../utils";
import {
  applySessionSetCookieFromUpstream,
  getSetCookieLines,
} from "./apply-session-set-cookie";

const ACTION = "registerAction";
const UPSTREAM_PATH = "/auth/register";

export type RegisterUserResult =
  | { ok: true; user: PublicUserDto }
  | {
      ok: false;
      code: "validation" | "conflict" | "unknown";
      message: string;
    };

export async function registerAction(
  raw: unknown,
): Promise<RegisterUserResult> {
  const parsedForm = createAuthSchema("register").safeParse(raw);
  if (!parsedForm.success) {
    const first = parsedForm.error.issues[0];
    return {
      ok: false,
      code: "validation",
      message: first?.message ?? "Dados inválidos.",
    };
  }

  const { name, email, password } = parsedForm.data;
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
      body: JSON.stringify({
        name: name?.trim(),
        email,
        password,
      }),
      signal: AbortSignal.timeout(15_000),
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
      message: "Serviço indisponível. Tente novamente.",
    };
  }

  const setCookies = getSetCookieLines(res);

  if (res.ok) {
    let json: unknown;
    try {
      json = await res.json();
    } catch (error) {
      reportServerActionError({
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
      reportServerActionError({
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

  if (res.status === 409) {
    return {
      ok: false,
      code: "conflict",
      message: "Este e-mail já está cadastrado.",
    };
  }

  if (res.status === 400 || res.status === 422) {
    return {
      ok: false,
      code: "validation",
      message: messageFromApi ?? "Dados inválidos.",
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
    message: "Não foi possível concluir o cadastro.",
  };
}

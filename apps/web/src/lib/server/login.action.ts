"use server";

import { cookies, headers } from "next/headers";
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
    console.error("[loginAction] missing API_URL or INTERNAL_API_URL");
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
    res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(xfwd ? { "x-forwarded-for": xfwd } : {}),
        ...(!xfwd && realIp ? { "x-forwarded-for": realIp } : {}),
      },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    console.error("[loginAction] upstream fetch failed");
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
    } catch {
      return {
        ok: false,
        code: "unknown",
        message: "Resposta inválida do servidor.",
      };
    }

    const bodyParsed = authSuccessBodySchema.safeParse(json);
    if (!bodyParsed.success) {
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

  console.error("[loginAction] unexpected status", res.status);

  return {
    ok: false,
    code: "unknown",
    message: "Não foi possível entrar. Tente novamente.",
  };
}

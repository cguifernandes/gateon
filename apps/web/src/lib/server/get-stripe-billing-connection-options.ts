import { cookies, headers } from "next/headers";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  type StripeBillingConnectionDto,
  stripeBillingConnectionOptionsResponseSchema,
} from "@/lib/zod/stripe-billing-schemas";
import { getSessionUser } from "./get-session";

export async function getStripeBillingConnectionOptions(): Promise<{
  connections: StripeBillingConnectionDto[];
  error: string | null;
}> {
  const base = getServerApiBaseUrl();
  if (!base) {
    return { connections: [], error: "API interna não configurada." };
  }

  const user = await getSessionUser();
  if (!user) {
    return { connections: [], error: "Sessão não encontrada." };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return { connections: [], error: "Sessão não encontrada." };
  }

  const requestHeaders = await headers();
  const forwardedFor =
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip");

  try {
    const response = await fetch(`${base}/stripe-billing/connections/options`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        connections: [],
        error: "Não foi possível carregar as conexões Stripe.",
      };
    }

    const raw: unknown = await response.json();
    const parsed = stripeBillingConnectionOptionsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        connections: [],
        error: "A resposta da API veio em formato inválido.",
      };
    }

    return { connections: parsed.data.connections, error: null };
  } catch {
    return {
      connections: [],
      error: "A API demorou para responder. Tente novamente.",
    };
  }
}

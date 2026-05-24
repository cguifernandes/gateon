import { cookies, headers } from "next/headers";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  type TelegramGroupDetailDto,
  telegramGroupDetailSchema,
} from "@/lib/zod/telegram-group-connection-schemas";

export async function getTelegramGroupById(groupId: string): Promise<{
  group: TelegramGroupDetailDto | null;
  error: string | null;
}> {
  const base = getServerApiBaseUrl();
  if (!base) {
    return { group: null, error: "API interna não configurada." };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return { group: null, error: "Sessão não encontrada." };
  }

  const requestHeaders = await headers();
  const forwardedFor =
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip");

  try {
    const response = await fetch(
      `${base}/telegram/groups/${encodeURIComponent(groupId)}`,
      {
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (response.status === 404) {
      return { group: null, error: "Grupo não encontrado." };
    }

    if (!response.ok) {
      return {
        group: null,
        error: "Não foi possível carregar a configuração do bot.",
      };
    }

    const raw: unknown = await response.json();
    const parsed = telegramGroupDetailSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        group: null,
        error: "A resposta da API veio em formato inválido.",
      };
    }

    return { group: parsed.data, error: null };
  } catch {
    return {
      group: null,
      error: "A API demorou para responder. Tente novamente.",
    };
  }
}

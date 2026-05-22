import { cookies, headers } from "next/headers";
import { telegramGroupsCacheTag } from "@/lib/cache-tags";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  type TelegramGroupSummaryDto,
  telegramGroupsResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import { getSessionUser } from "./get-session";

export async function getTelegramGroupsForMembers(): Promise<{
  groups: TelegramGroupSummaryDto[];
  error: string | null;
}> {
  const base = getServerApiBaseUrl();
  if (!base) {
    return { groups: [], error: "API interna não configurada." };
  }

  const user = await getSessionUser();
  if (!user) {
    return { groups: [], error: "Sessão não encontrada." };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return { groups: [], error: "Sessão não encontrada." };
  }

  const requestHeaders = await headers();
  const forwardedFor =
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip");

  try {
    const response = await fetch(`${base}/telegram/groups?view=members`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      next: { tags: [telegramGroupsCacheTag(user.id)] },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        groups: [],
        error: "Não foi possível carregar os membros dos grupos.",
      };
    }

    const raw: unknown = await response.json();
    const parsed = telegramGroupsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        groups: [],
        error: "A resposta da API veio em formato inválido.",
      };
    }

    return { groups: parsed.data, error: null };
  } catch {
    return {
      groups: [],
      error: "A API demorou para responder. Tente novamente.",
    };
  }
}

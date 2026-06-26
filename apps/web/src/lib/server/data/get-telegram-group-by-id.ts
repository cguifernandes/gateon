import { cache } from "react";
import {
  type TelegramGroupDetailDto,
  telegramGroupDetailSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import {
  fetchAuthenticatedUpstreamRaw,
  UPSTREAM_ERRORS,
} from "../fetch/authenticated-upstream";

export const getTelegramGroupById = cache(async function getTelegramGroupById(
  groupId: string,
): Promise<{
  group: TelegramGroupDetailDto | null;
  error: string | null;
}> {
  const upstream = await fetchAuthenticatedUpstreamRaw({
    path: `/telegram/groups/${encodeURIComponent(groupId)}`,
    requireSessionUser: false,
  });

  if (!upstream.ok) {
    return { group: null, error: upstream.error };
  }

  const { response } = upstream;

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
    return { group: null, error: UPSTREAM_ERRORS.invalidResponse };
  }

  return { group: parsed.data, error: null };
});

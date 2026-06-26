import { telegramGroupsCacheTag } from "@/lib/telegram/cache-tags";
import {
  type TelegramGroupSummaryDto,
  telegramGroupOptionsResponseSchema,
} from "@/lib/zod/telegram-group-connection-schemas";
import {
  fetchAuthenticatedUpstreamJson,
  resolveUpstreamSession,
} from "../fetch/authenticated-upstream";

export async function getTelegramGroupOptions(): Promise<{
  groups: TelegramGroupSummaryDto[];
  error: string | null;
}> {
  const session = await resolveUpstreamSession();
  if (!session.ok) {
    return { groups: [], error: session.error };
  }

  const result = await fetchAuthenticatedUpstreamJson({
    path: "/telegram/groups/options",
    schema: telegramGroupOptionsResponseSchema,
    httpErrorMessage: "Não foi possível carregar os grupos conectados.",
    cacheTags: [telegramGroupsCacheTag(session.ctx.userId)],
  });

  if (!result.ok) {
    return { groups: [], error: result.error };
  }

  return { groups: result.data.groups, error: null };
}

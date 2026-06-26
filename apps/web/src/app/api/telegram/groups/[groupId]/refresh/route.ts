import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/data/get-session";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import { telegramGroupsCacheTag } from "@/lib/telegram/cache-tags";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: `/telegram/groups/${encodeURIComponent(groupId)}/refresh`,
    routeLabel: "/api/telegram/groups/[groupId]/refresh",
    timeoutMs: 20_000,
    init: { method: "POST" },
  });

  if (!response.ok) {
    return response;
  }

  const user = await getSessionUser();
  if (user) {
    revalidateTag(telegramGroupsCacheTag(user.id), "max");
  }
  revalidatePath("/groups");

  const body: unknown = await response
    .json()
    .catch(() => ({ refreshed: true }));
  return NextResponse.json(body);
}

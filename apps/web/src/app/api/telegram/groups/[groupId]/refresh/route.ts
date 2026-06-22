import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { telegramGroupsCacheTag } from "@/lib/cache-tags";
import { getSessionUser } from "@/lib/server/get-session";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";

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

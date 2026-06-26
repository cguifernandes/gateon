import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/data/get-session";
import { proxyAuthenticatedJsonApi } from "@/lib/server/fetch/proxy-authenticated-json-api";
import { telegramGroupsCacheTag } from "@/lib/telegram/cache-tags";

export async function POST(request: NextRequest) {
  const response = await proxyAuthenticatedJsonApi({
    request,
    upstreamPath: "/telegram/groups/refresh-all",
    routeLabel: "/api/telegram/groups/refresh-all",
    timeoutMs: 120_000,
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
  revalidatePath("/members");

  const body: unknown = await response.json().catch(() => null);
  return NextResponse.json(body);
}

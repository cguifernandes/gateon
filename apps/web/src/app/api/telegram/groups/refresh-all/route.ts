import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { telegramGroupsCacheTag } from "@/lib/cache-tags";
import { getSessionUser } from "@/lib/server/get-session";
import { proxyAuthenticatedJsonApi } from "@/lib/server/proxy-authenticated-json-api";

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

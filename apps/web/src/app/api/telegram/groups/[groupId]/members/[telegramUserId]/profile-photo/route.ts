import type { NextRequest } from "next/server";
import { proxyAuthenticatedBinaryApi } from "@/lib/server/fetch/proxy-authenticated-json-api";

const ROUTE_LABEL =
  "/api/telegram/groups/[groupId]/members/[telegramUserId]/profile-photo";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ groupId: string; telegramUserId: string }>;
  },
) {
  const { groupId, telegramUserId } = await context.params;

  return proxyAuthenticatedBinaryApi({
    request,
    upstreamPath: `/telegram/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(telegramUserId)}/profile-photo`,
    routeLabel: ROUTE_LABEL,
  });
}
